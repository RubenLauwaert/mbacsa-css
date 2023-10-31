import { CredentialSet, CredentialsExtractor, Authorizer, PermissionReader, ModesExtractor, ResponseDescription,
    getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler, UnauthorizedHttpError, NotImplementedHttpError, ensureTrailingSlash, JsonFileStorage , ReadWriteLocker, EqualReadWriteLocker, FileSystemResourceLocker, VoidLocker, OkResponseDescription, RepresentationMetadata, guardedStreamFrom } from '@solid/community-server';
import { RevocationRequestParser } from '../parse/RevocationRequestParser';
import { MacaroonsExtractor } from '../../mbacsa/MacaroonsExtractor';
import { extractWebID } from '../../util/Util';
import { RevocationResponse } from '../../types/Responses';
import { RevocationStore } from '../../storage/RevocationStore';
import { RevocationStatement } from '../../types/RevocationStatement';
import { MbacsaCredential } from '../../mbacsa/MbacsaCredential';

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
  const {serializedMacaroons, revoker, revokee} = RevocationRequestParser.parseRevocationRequest(operation.body);

  // 2. Authenticate requestor
  const credentials: CredentialSet = await this.credentialsExtractor.handleSafe(request);
  const authenticatedAgent = credentials.agent?.webId;
    // Check if authenticated agent is equal to revoker
  if(authenticatedAgent !== revoker){throw new Error("Revoker does not match authenticated agent !")};
  // 3. Extract macaroon + discharge macaroons to revoke 
  const macaroons = MacaroonsExtractor.extractMacaroons(serializedMacaroons.toString());
  // 4. Convert macaroons to MbacsaCredential
  const rootMacaroon = macaroons[0];
  const issuer = extractWebID(rootMacaroon.location);
  const rootMacaroonIdentifier = rootMacaroon.identifier;
  const revocationStatements = await new RevocationStore(issuer).get(rootMacaroonIdentifier);
  const mbacsaCredential = new MbacsaCredential(macaroons,revocationStatements);
  // 5. Check if credential is authorized
  const isCredentialAuthorized = mbacsaCredential.isCredentialAuthorized();
  if(!isCredentialAuthorized){throw new UnauthorizedHttpError("Provided macaroon to revoke is itself not authorized!")}
  // 6. Check if revoker is authorized to revoke 
  const isRevokerAuthorized = mbacsaCredential.isRevokerAuthorized(revoker,revokee);
  if(!isRevokerAuthorized){throw new Error("Revoker is not authorized to revoke revokee!")}
  // 7. Updating revocation store 
  try {
    const storeOwner = mbacsaCredential.getIssuer();
    const store = new RevocationStore(storeOwner);
    const positionRevokee = mbacsaCredential.getAgentPositionInChain(revokee) as number;
    const newRevocationStatement:RevocationStatement = {revokee, positionRevokee}
    await store.insertRevocationStatement(mbacsaCredential.getIdentifier(), newRevocationStatement);
    this.logger.info("Successfully updated the revocation store for : " + storeOwner);
    // Send response 
    const revocationResponse:RevocationResponse = {success: true }
    return new OkResponseDescription(new RepresentationMetadata(), guardedStreamFrom(JSON.stringify(revocationResponse)));

  } catch (error) {
    throw new Error("Could not write to revocation store : " + error)
  }

}
}