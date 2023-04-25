import { ResponseDescription,
  getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler, guardedStreamFrom, OkResponseDescription, RepresentationMetadata, CredentialsExtractor, ModesExtractor, PermissionReader, ensureTrailingSlash, CredentialSet, IdentifierSetMultiMap, AccessMode, ResourceIdentifier, Authorizer } from '@solid/community-server';
import { MintRequestParser } from './MintRequestParser';
import { MacaroonMinter } from './MacaroonMinter';

  export interface MacaroonMintHttpHandlerArgs {
    endpoint : string,
    baseUrl : string,
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
  }

export class MacaroonMintHttpHandler extends OperationHttpHandler {
private readonly logger = getLoggerFor(this);
private readonly credentialsExtractor: CredentialsExtractor;
private readonly modesExtractor: ModesExtractor;
private readonly permissionReader: PermissionReader;
private readonly authorizer: Authorizer;
private readonly baseUrl : string;
private readonly endpoint : string;
private readonly mintUrl : string;

public constructor(args: MacaroonMintHttpHandlerArgs) {
  super();
  this.baseUrl = ensureTrailingSlash(args.baseUrl);
  this.endpoint = args.endpoint;
  this.credentialsExtractor = args.credentialsExtractor;
  this.modesExtractor = args.modesExtractor;
  this.permissionReader = args.permissionReader;
  this.authorizer = args.authorizer;
  this.mintUrl = this.baseUrl + this.endpoint;
}

public async canHandle(input: OperationHttpHandlerInput): Promise<void> {
  const { operation, request } = input;
    if(operation.target.path !== this.mintUrl){
      throw new Error();
    }




    // Check if body of request satisfies JSON Schema of MintRequest
    // if(operation.body.data.readable){
    //   const requestData = operation.body.data.read();
    //   // Will throw an error if request dissatisfies JSON Schema
    //   const { requestor} = MintRequestParser.parseMintRequest(requestData);
    //   this.logger.info(requestor);
    //    // Authentication - Check if verified web_id is equal to requestor web_id
      
    //   // Authorization - Check if this web_id is authorized for accessing resource in WAC standards
    // }
   

}


public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
  const { request, operation } = input;

  // Parse Request data
  if(operation.body.data.readable){
    const requestData = operation.body.data.read();
    try {
      // Will throw an error if request dissatisfies JSON Schema
      const mintRequest = MintRequestParser.parseMintRequest(requestData);

      // Authenticate requestor
      const credentials: CredentialSet = await this.credentialsExtractor.handleSafe(request);
      this.logger.info(`Extracted credentials: ${JSON.stringify(credentials)}`);
      const {requestor} = mintRequest;
      if(credentials.agent?.webId !== undefined && requestor !== credentials.agent!.webId){
        throw new Error("Invalid credentials !");
      }
      // Authorize request
      const {resourceURI} = mintRequest;
      const requestedModes = new IdentifierSetMultiMap<AccessMode>()
        .add({path: resourceURI},AccessMode.read);

      const availablePermissions = await this.permissionReader.handleSafe({ credentials, requestedModes });
      this.logger.info(`Available permissions are ${JSON.stringify(availablePermissions)}`);

      try {
        await this.authorizer.handleSafe({ credentials, requestedModes, availablePermissions });
        operation.availablePermissions = availablePermissions;
      } catch (error: unknown) {
        this.logger.verbose(`Authorization failed: ${(error as any).message}`);
        throw error;
      }

      this.logger.verbose(`Authorization succeeded !`);

      // Mint Macaroon 
      const mintedMacaroon = await new MacaroonMinter().mintMacaroon(mintRequest);
      const responseData = guardedStreamFrom(mintedMacaroon);
      const response = new OkResponseDescription(new RepresentationMetadata(),responseData)

      return response;

    } catch (error) {
      throw error;
    }
  }else{
    throw new Error("Invalid request body !");
  }
}
}