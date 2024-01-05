import { CredentialSet, CredentialsExtractor, Authorizer, PermissionReader, ModesExtractor, ResponseDescription,
      getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler, UnauthorizedHttpError, BasicRepresentation, guardedStreamFrom } from '@solid/community-server';
import { MacaroonsExtractor } from '../../mbacsa/MacaroonsExtractor';
import { MbacsaCredential } from '../../mbacsa/MbacsaCredential';
import { RevocationStore } from '../../storage/RevocationStore';
import { extractWebID } from '../../util/Util';
import { MacaroonsDeSerializer } from 'macaroons.js';
import { AuthorizationRequestParser } from '../parse/AuthorizationRequestParser';
import { Readable } from 'readable-stream';


export interface AuthorizingHttpHandlerArgs {
  /**
   * Extracts the credentials from the incoming request.
   */
  credentialsExtractor: CredentialsExtractor;
  /**
   * Extracts the required modes from the generated Operation.
   */
  modesExtractor: ModesExtractor;
  /**
   * Reads the permissions available for the Operation.
   */
  permissionReader: PermissionReader;
  /**
   * Verifies if the requested operation is allowed.
   */
  authorizer: Authorizer;
  /**
   * Handler to call if the operation is authorized.
   */
  operationHandler: OperationHttpHandler;
}

/**
 * MacaroonAuthorizingHttpHandler is responsible for handling HTTP requests with macaroon-based authorization.
 * It extends OperationHttpHandler and includes methods to check if a request can be handled and to process
 * the request with macaroon-based authorization.
 */
export class MacaroonAuthorizingHttpHandler extends OperationHttpHandler {
  private readonly logger = getLoggerFor(this);

  // The following private members are initialized via the constructor
  private readonly credentialsExtractor: CredentialsExtractor;
  private readonly modesExtractor: ModesExtractor;
  private readonly operationHandler: OperationHttpHandler;

  /**
   * Constructs a new instance of MacaroonAuthorizingHttpHandler.
   * 
   * @param args - Arguments including credentials extractor, modes extractor, and operation handler.
   */
  public constructor(args: AuthorizingHttpHandlerArgs) {
    super();
    this.credentialsExtractor = args.credentialsExtractor;
    this.modesExtractor = args.modesExtractor;
    this.operationHandler = args.operationHandler;
  }

  /**
   * Ensures the incoming request contains a macaroon authorization header.
   * 
   * @param input - The input containing the operation details and request.
   * @throws Throws an error if a macaroon is not provided in the authorization header.
   */
  public async canHandle(input: OperationHttpHandlerInput): Promise<void> {
      const {request} = input;
      const {headers} = request;
      const authorizationHeader = headers.authorization!;
      if(authorizationHeader !== 'macaroon'){
        throw new Error("Macaroon is not provided !")
      }
  }

  /**
   * Processes the incoming HTTP request with macaroon-based authorization.
   * 
   * @param input - The input containing the operation and request details.
   * @returns A promise resolving to a ResponseDescription.
   * @throws Throws an error if the request does not meet the expected criteria for MBACSA authorization.
   */
  public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
    const { request, operation } = input;
    const { headers } = request;
    const { body, method } = operation;
 
    // Ensuring the request method is POST for MBACSA authorization
    if(method !== 'POST'){throw new Error("A request authorized via MBACSA should always be a POST request !")}
    // Extracting root macaroon from header
    const serializedRootMacaroon = headers['macaroon'] as string;
    /*
      Parsing the request body for retrieving discharge macaroons from body
      Design decision that allows to scale to longer delegation chains
      since can't fit enough discharge macaroons in header section (max. 11)
    */
    const parsedRequestBody = AuthorizationRequestParser.parseMbacsaAuthorizationRequest(body);
    if(!parsedRequestBody){throw new Error("Request body for authorizing request via MBACSA could not be parsed !")}
    const {serializedDischargeMacaroons } = parsedRequestBody;
    // Extracting macaroons from the HTTP header section
    const macaroons = MacaroonsExtractor.extractMacaroons([serializedRootMacaroon,...serializedDischargeMacaroons].toString());
    // Retrieve revocation statements related to root macaroon
    const rootMacaroon = macaroons[0];
    const issuer = extractWebID(rootMacaroon.location);
    const rootMacaroonIdentifier = rootMacaroon.identifier;
    const revocationStatements = await new RevocationStore(issuer).get(rootMacaroonIdentifier);
    // Construct credential
    const mbacsaCredential = new MbacsaCredential(macaroons,revocationStatements);
    // Check if credential is authorized
    const isCredentialAuthorized = mbacsaCredential.isCredentialAuthorized();
    if(!isCredentialAuthorized){
      this.logger.info("Could not authorize agent: " + mbacsaCredential.getAgentLastInChain() + " at position: " + mbacsaCredential.getChainLength());
      throw new Error("Presented Mbacsa credential is not authorized !")}
    // Transform POST request to request linked with access mode in credential
    // by updating request body such that it only contains the request data and not
    // the provided discharge macaroons
    input.operation.method = mbacsaCredential.getHTTPMethod();
    if(parsedRequestBody.body){
      const requestData = guardedStreamFrom(parsedRequestBody.body)
      input.operation.body.data = requestData;
    }
    
    this.logger.info("Succesfully authorized: " + mbacsaCredential.getAgentLastInChain() + " at position: " + mbacsaCredential.getChainLength())
    return this.operationHandler.handleSafe(input);
  }
}