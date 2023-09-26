import { CredentialSet, CredentialsExtractor, Authorizer, PermissionReader, ModesExtractor, ResponseDescription,
    getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler, UnauthorizedHttpError, NotImplementedHttpError, ensureTrailingSlash, JsonFileStorage , ReadWriteLocker, EqualReadWriteLocker, FileSystemResourceLocker, VoidLocker, OkResponseDescription, RepresentationMetadata, guardedStreamFrom } from '@solid/community-server';
import { AuthorizingHttpHandlerArgs } from '@solid/community-server';
import { RevocationRequestParser } from './RevocationRequestParser';
import { MacaroonsExtractor } from '../authorization/MacaroonsExtractor';
import { MacaroonsAuthorizer } from '../authorization/MacaroonsAuthorizer';
import { extractPathToPod, extractPodName } from '../../util/Util';
import { RevocationResponse } from '../../types/Response';
import { RevocationStore } from '../../storage/RevocationStore';
import { RevocationStatement } from '../../types/RevocationStatement';

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

  // 1. Parse revocation request
  const {serializedMacaroons, resourceOwner, revoker, revokee} = RevocationRequestParser.parseRevocationRequest(operation.body);

  // 2. Authenticate requestor
  const credentials: CredentialSet = await this.credentialsExtractor.handleSafe(request);
  const authenticatedAgent = credentials.agent?.webId;
  if(authenticatedAgent !== revoker){throw new Error("Revoker does not match authenticated agent !")};
  // 3. Extract macaroon + discharge macaroons to revoke 
  const macaroons = MacaroonsExtractor.extractMacaroons(serializedMacaroons.toString());
  const [rootMacaroon,...dischargeMacaroons] = macaroons;
  // 4. Verify if macaroon to revoke is valid 
  this.logger.info(rootMacaroon.location)
  const resourceURI = {path: rootMacaroon.location};
  const macaroonsVerifier = new MacaroonsAuthorizer(resourceURI,macaroons);
  const isAuthorized = macaroonsVerifier.isAuthorized();
  if(!isAuthorized){throw new Error("Unauthorized to make revocation request: presented macaroon is not valid !")};

  // Check if revoker is present in chain of delegations (discharge macaroons)
  const positionRevoker = MacaroonsExtractor.retrieveDelegationPositionForAgent(dischargeMacaroons, revoker);
  if(positionRevoker === 0){throw new Error("Position of given revoker could not be found in discharge macaroons !")}
  // Check if revokee is present in chain of delegations (discharge macaroons)
  const positionRevokee = MacaroonsExtractor.retrieveDelegationPositionForAgent(dischargeMacaroons,revokee);
  if(positionRevokee === 0){throw new Error("Position of given revokee could not be found in discharge macaroons !")}
  // Check if revoker is previous (in)direct delegator of revokee (check positions in chain)
  if(positionRevoker > positionRevokee){throw new Error("Revoker is not authorized to revoke revokee : revoker is not an indirect delegator of revokee !")}


  try {
    // Updating revocation store 
    const store = new RevocationStore(resourceOwner);
    const newRevocationStatement:RevocationStatement = {revokee, positionRevokee}
    await store.insertRevocationStatement(rootMacaroon.identifier, newRevocationStatement);
    this.logger.info("Successfully updated the revocation store for : " + resourceOwner);
    // Send response 
    const revocationResponse:RevocationResponse = {success: true }
    return new OkResponseDescription(new RepresentationMetadata(), guardedStreamFrom(JSON.stringify(revocationResponse)));

  } catch (error) {
    throw new Error("Could not write to revocation store : " + error)
  }

}
}