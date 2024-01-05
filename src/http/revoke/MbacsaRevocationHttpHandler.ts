import { CredentialSet, CredentialsExtractor, Authorizer, PermissionReader, ModesExtractor, ResponseDescription,
    getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler, UnauthorizedHttpError, NotImplementedHttpError, ensureTrailingSlash, JsonFileStorage , ReadWriteLocker, EqualReadWriteLocker, FileSystemResourceLocker, VoidLocker, OkResponseDescription, RepresentationMetadata, guardedStreamFrom } from '@solid/community-server';
import { RevocationRequestParser } from '../parse/RevocationRequestParser';
import { MacaroonsExtractor } from '../../mbacsa/MacaroonsExtractor';
import { extractWebID } from '../../util/Util';
import { RevocationResponse } from '../../types/Responses';
import { RevocationStore } from '../../storage/RevocationStore';
import { RevocationStatement } from '../../types/RevocationStatement';
import { MbacsaCredential } from '../../mbacsa/MbacsaCredential';


/**
 * Interface for arguments required by MacaroonRevocationHttpHandler.
 */
export interface MacaroonRevocationHttpHandlerArgs {
  credentialsExtractor: CredentialsExtractor,
  baseUrl : string,
  endpoint : string,
  revocationStore: JsonFileStorage
}


/**
 * Handles HTTP requests for revoking macaroons.
 */
export class MacaroonRevocationHttpHandler extends OperationHttpHandler {
private readonly logger = getLoggerFor(this);

private readonly baseUrl:string;
private readonly endpoint:string;
private readonly revokeUrl:string;


 /**
   * Constructor for MacaroonRevocationHttpHandler.
   * @param args - Arguments for the handler, including credentials extractor, base URL, endpoint, and revocation store.
  */
public constructor(args: MacaroonRevocationHttpHandlerArgs) {
  super();
  this.baseUrl = ensureTrailingSlash(args.baseUrl);
  this.endpoint = args.endpoint;
  this.revokeUrl = this.baseUrl + this.endpoint;
}

/**
 * Determines if the handler can process the given input.
 * @param input - The input containing the operation details.
 * @throws An error if the request URL does not match the handler's revoke URL.
*/
public async canHandle(input: OperationHttpHandlerInput): Promise<void> {
  const {target, body} = input.operation;  

  // Check if URL of request matches the endpoint to revoke macaroons
  if(target.path !== this.revokeUrl){
    throw new Error("URL of request doesn't match URL for revoking macaroons!")
  }

}


/**
   * Processes the revocation request.
   * @param input - The input containing the operation and request details.
   * @returns A response indicating the success or failure of the revocation process.
   * @throws UnauthorizedHttpError if the provided macaroon is not authorized or the revoker is not authorized to revoke.
  */
public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
  const { request, operation } = input;
  const { headers } = request;
  const { target } = operation;

  // Parse revocation request
  const {serializedMacaroons, revoker, revokee} = RevocationRequestParser.parseRevocationRequest(operation.body);
  // Extract macaroon + discharge macaroons to revoke 
  const macaroons = MacaroonsExtractor.extractMacaroons(serializedMacaroons.toString());
  // Convert macaroons to MbacsaCredential
  const rootMacaroon = macaroons[0];
  const issuer = extractWebID(rootMacaroon.location);
  const rootMacaroonIdentifier = rootMacaroon.identifier;
  const revocationStatements = await new RevocationStore(issuer).get(rootMacaroonIdentifier);
  const mbacsaCredential = new MbacsaCredential(macaroons,revocationStatements);
  // Check if credential is authorized
  const isCredentialAuthorized = mbacsaCredential.isCredentialAuthorized();
  if(!isCredentialAuthorized){throw new UnauthorizedHttpError("Provided macaroon to revoke is itself not authorized!")}
  // Check if revoker is authorized to revoke 
  const isRevokerAuthorized = mbacsaCredential.isRevokerAuthorized(revoker,revokee);
  if(!isRevokerAuthorized){throw new Error("Revoker is not authorized to revoke revokee!")}
  // Updating revocation store 
  try {
    const storeOwner = mbacsaCredential.getIssuer();
    const store = new RevocationStore(storeOwner);
    const positionRevokee = mbacsaCredential.getChainLength() + 1;
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