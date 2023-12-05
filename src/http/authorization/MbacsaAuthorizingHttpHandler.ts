import { CredentialSet, CredentialsExtractor, Authorizer, PermissionReader, ModesExtractor, ResponseDescription,
      getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler, UnauthorizedHttpError } from '@solid/community-server';
import { MacaroonsExtractor } from '../../mbacsa/MacaroonsExtractor';
import { MbacsaCredential } from '../../mbacsa/MbacsaCredential';
import { RevocationStore } from '../../storage/RevocationStore';
import { extractWebID } from '../../util/Util';
import { MacaroonsDeSerializer } from 'macaroons.js';


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

export class MacaroonAuthorizingHttpHandler extends OperationHttpHandler {
  private readonly logger = getLoggerFor(this);

  private readonly credentialsExtractor: CredentialsExtractor;
  private readonly modesExtractor: ModesExtractor;
  private readonly operationHandler: OperationHttpHandler;

  public constructor(args: AuthorizingHttpHandlerArgs) {
    super();
    this.credentialsExtractor = args.credentialsExtractor;
    this.modesExtractor = args.modesExtractor;
    this.operationHandler = args.operationHandler;
  }


  public async canHandle(input: OperationHttpHandlerInput): Promise<void> {
      const {request} = input;
      const {headers} = request;
      const authorizationHeader = headers.authorization!;
      if(authorizationHeader !== 'macaroon'){
        throw new Error("Macaroon is not provided !")
      }
  }

  public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
    const { request, operation } = input;
    const { headers } = request;
    const { target } = operation;

    
    // 1. Extract macaroons
    const startAuthorizingTime = process.hrtime();
    const serializedMacaroons = headers['macaroon'] as string;
    const macaroons = MacaroonsExtractor.extractMacaroons(serializedMacaroons);
    this.logger.info(macaroons[macaroons.length - 1].inspect());
    // 2. Get revocation statements for corresponding root macaroon
    const rootMacaroon = macaroons[0];
    const issuer = extractWebID(rootMacaroon.location);
    const rootMacaroonIdentifier = rootMacaroon.identifier;
    const revocationStatements = await new RevocationStore(issuer).get(rootMacaroonIdentifier);
    // 3. Construct MbacsaCredential 
    const mbacsaCredential = new MbacsaCredential(macaroons,revocationStatements);
      // Check if credential is authorized
    const isCredentialAuthorized = mbacsaCredential.isCredentialAuthorized();
    if(!isCredentialAuthorized){
      this.logger.info("Could not authorize agent: " + mbacsaCredential.getAgentLastInChain() + " at position: " + mbacsaCredential.getChainLength());
      throw new Error("Presented Mbacsa credential is not authorized !")}
      // Check if attenuated access mode contained in mbacsa credential equals access mode of request
    const attenuatedMode = mbacsaCredential.getAttenuatedAccessMode();
    const requestedAccessMap = await this.modesExtractor.handleSafe(operation);
    const requestedAccessMode = requestedAccessMap.values().next().value;
    if(attenuatedMode !== requestedAccessMode){
      this.logger.info("Could not authorize agent: " + mbacsaCredential.getAgentLastInChain() + " at position: " + mbacsaCredential.getChainLength());
      throw new Error("Access mode from mbacsa credential does not match requested access mode !")};
    const endAuthorizingTime = process.hrtime(startAuthorizingTime);
    const elapsedAuthorizingTime = endAuthorizingTime[0] * 1e6 + endAuthorizingTime[1] / 1e3;
    this.logger.info("Succesfully authorized: " + mbacsaCredential.getAgentLastInChain() + " at position: " + mbacsaCredential.getChainLength())
    this.logger.info("Elapsed internal authorization time: " + elapsedAuthorizingTime + "microseconds")
    return this.operationHandler.handleSafe(input);
  }
}