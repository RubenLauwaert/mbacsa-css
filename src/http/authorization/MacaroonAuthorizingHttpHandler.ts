import { CredentialSet, CredentialsExtractor, Authorizer, PermissionReader, ModesExtractor, ResponseDescription,
      getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler, UnauthorizedHttpError } from '@solid/community-server';
import { MacaroonsExtractor } from './MacaroonsExtractor';
import { MacaroonsAuthorizer } from './MacaroonsAuthorizer';
import { MbacsaCredential } from '../../mbacsa/MbacsaCredential';
import { RevocationStore } from '../../storage/RevocationStore';


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
 * Handles all the necessary steps for an authorization.
 * Errors if authorization fails, otherwise passes the parameter to the operationHandler handler.
 * The following steps are executed:
 *  - Extracting credentials from the request.
 *  - Extracting the required permissions.
 *  - Reading the allowed permissions for the credentials.
 *  - Validating if this operation is allowed.
 */
export class MacaroonAuthorizingHttpHandler extends OperationHttpHandler {
  private readonly logger = getLoggerFor(this);

  private readonly credentialsExtractor: CredentialsExtractor;
  private readonly modesExtractor: ModesExtractor;
  private readonly permissionReader: PermissionReader;
  private readonly authorizer: Authorizer;
  private readonly operationHandler: OperationHttpHandler;

  public constructor(args: AuthorizingHttpHandlerArgs) {
    super();
    this.credentialsExtractor = args.credentialsExtractor;
    this.modesExtractor = args.modesExtractor;
    this.permissionReader = args.permissionReader;
    this.authorizer = args.authorizer;
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


    // Extract macaroons
    const serializedMacaroons = headers['macaroon'] as string;
    const macaroons = MacaroonsExtractor.extractMacaroons(serializedMacaroons);
    // Verify macaroons 
    const macaroonsAuthorizer = new MacaroonsAuthorizer(target,macaroons);
    const isMacaroonAuthorized = macaroonsAuthorizer.isAuthorized();
    if(!isMacaroonAuthorized){throw new UnauthorizedHttpError("Presented macaroon is not authorized !")}
    // Convert macaroons to MbacsaCredential 
    const mbacsaCredential = new MbacsaCredential(macaroons);
    // Check if credential is not revoked
    const revocationStore = new RevocationStore(mbacsaCredential.getIssuer());
    const revocationStatements = await revocationStore.get(mbacsaCredential.getIdentifier());
    if(revocationStatements){
      const isRevoked = mbacsaCredential.isCredentialRevoked(revocationStatements);
      if(isRevoked){throw new Error(`Delegated permissions for agent : ${mbacsaCredential.getAgentLastInChain()} are revoked !`)}
    }
    // Check if attenuated access mode contained in mbacsa credential equals access mode of request
    const attenuatedMode = mbacsaCredential.getAttenuatedAccessMode();
    const requestedAccessMap = await this.modesExtractor.handleSafe(operation);
    const requestedAccessMode = requestedAccessMap.values().next().value;
    if(attenuatedMode !== requestedAccessMode){throw new Error("Access mode from mbacsa credential does not match requested access mode !")};
    
    return this.operationHandler.handleSafe(input);
  }
}