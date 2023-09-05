import { CredentialSet, CredentialsExtractor, Authorizer, PermissionReader, ModesExtractor, ResponseDescription,
    getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler, UnauthorizedHttpError, NotImplementedHttpError, ensureTrailingSlash, JsonFileStorage , ReadWriteLocker, EqualReadWriteLocker, FileSystemResourceLocker, VoidLocker } from '@solid/community-server';
import { AuthorizingHttpHandlerArgs } from '@solid/community-server';
import { RevocationRequestParser } from './RevocationRequestParser';
import { MacaroonsExtractor } from '../authorization/MacaroonsExtractor';
import { MacaroonsAuthorizer } from '../authorization/MacaroonsAuthorizer';

export interface MacaroonRevocationHttpHandlerArgs {
  /**
   * Extracts the credentials from the incoming request.
   */
  credentialsExtractor: CredentialsExtractor,
  baseUrl : string,
  endpoint : string,
  revocationStore: JsonFileStorage
}




export class MacaroonRevocationHttpHandler extends OperationHttpHandler {
private readonly logger = getLoggerFor(this);

private readonly credentialsExtractor: CredentialsExtractor;
private readonly baseUrl:string;
private readonly endpoint:string;
private readonly revokeUrl:string;
private readonly revocationStore:JsonFileStorage;

public constructor(args: MacaroonRevocationHttpHandlerArgs) {
  super();
  this.credentialsExtractor = args.credentialsExtractor;
  this.baseUrl = ensureTrailingSlash(args.baseUrl);
  this.endpoint = args.endpoint;
  this.revokeUrl = this.baseUrl + this.endpoint;
  this.revocationStore = args.revocationStore;
}


public async canHandle(input: OperationHttpHandlerInput): Promise<void> {
  const {target, body} = input.operation;  

  // Check if URL of request matches the endpoint to revoke macaroons
  if(target.path !== this.revokeUrl){
    throw new Error("URL of request doesn't match URL for revoking macaroons!")
  }

}

public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
  const { request, operation } = input;
  const { headers } = request;
  const { target } = operation;


  // 1. Authenticate requestor


  // 2. Parse revocation request
  const {serializedMacaroons, resourceOwner, revoker, revokee} = RevocationRequestParser.parseRevocationRequest(operation.body);

  // 3. Extract macaroon + discharge macaroons to revoke 
  const macaroons = MacaroonsExtractor.extractMacaroons(serializedMacaroons.toString());
  const [rootMacaroon,...dischargeMacaroons] = macaroons;
  // 4. Verify if macaroon to revoke is valid 
    // 4.1. Check if it is structurally ok --> discharge macaroons for tp-caveats + check sig (via library)
    const resourceURI = {path: rootMacaroon.location};
    const macaroonsVerifier = new MacaroonsAuthorizer(resourceURI,macaroons);
    const isAuthorized = macaroonsVerifier.isAuthorized();
    if(!isAuthorized){throw new Error("Unauthorized to make revocation request: presented macaroon is not valid !")};
    // 4.2. Check if webID of revoker equals webID of discharge macaroon last in the chain
    const lastDischargeMacaroonInChain = dischargeMacaroons[dischargeMacaroons.length - 1];
    const agentLastInChain = MacaroonsExtractor.extractDelegatedAgentFromMacaroon(lastDischargeMacaroonInChain);
    if(agentLastInChain != revoker){throw new Error("Unauthorized to make revocation request: revoker is not last in the delegation chain !")};

  // 5. Check if revoker WebID is equal to the authenticated agent

  // 6. Add <RM_ID,DM_ID> to RevocationStore
  // this.revocationStore.set(rootMacaroon.identifier,lastDischargeMacaroonInChain.identifier);
  const revocationStorePath = resourceOwner.replace("/profile/card#me","") + "/mbacsa/revocation-store";
  
  const locker = new VoidLocker();
  const store = new JsonFileStorage("Bob/mbacsa/revocation-store",locker);
  store.set(rootMacaroon.identifier, revokee);

  throw new NotImplementedHttpError("Revocation is not implemented yet !");
}
}