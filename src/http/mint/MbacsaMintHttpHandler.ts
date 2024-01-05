import { ResponseDescription,
  getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler, guardedStreamFrom, OkResponseDescription, RepresentationMetadata, CredentialsExtractor, ModesExtractor, PermissionReader, ensureTrailingSlash, CredentialSet, IdentifierSetMultiMap, AccessMode, ResourceIdentifier, Authorizer } from '@solid/community-server';
import { MintRequestParser } from '../parse/MintRequestParser';
import { MacaroonMinter } from './MbacsaMinter';

  /**
   * Interface for the constructor arguments of MacaroonMintHttpHandler.
   */
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

/**
 * MacaroonMintHttpHandler is responsible for handling HTTP requests for minting macaroons.
 * It extends OperationHttpHandler and includes methods for determining if a request can be handled
 * and for processing the request to mint a macaroon.
 */
export class MacaroonMintHttpHandler extends OperationHttpHandler {
private readonly logger = getLoggerFor(this);
private readonly credentialsExtractor: CredentialsExtractor;
private readonly modesExtractor: ModesExtractor;
private readonly permissionReader: PermissionReader;
private readonly authorizer: Authorizer;
private readonly baseUrl : string;
private readonly endpoint : string;
private readonly mintUrl : string;


/**
 * Constructs a new instance of MacaroonMintHttpHandler.
 * 
 * @param args - Arguments including the base URL, endpoint, credentials extractor,
 *               modes extractor, permission reader, and authorizer.
 */
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


/**
 * Determines if the incoming request can be handled by this handler.
 * 
 * @param input - The input containing the operation details and request.
 * @throws Throws an error if the request does not target the mint URL.
  */
public async canHandle(input: OperationHttpHandlerInput): Promise<void> {
  const { operation } = input;
    if(operation.target.path !== this.mintUrl){
      throw new Error("This request can not be handled !");
    }
}

/**
 * Handles the minting of a macaroon based on the incoming request.
 * 
 * @param input - The input containing the operation and request details.
 * @returns A promise resolving to a ResponseDescription.
 * @throws Throws an error for invalid mint requests or if any part of the mint request processing fails.
 */
public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
  const { request, operation } = input;

  if(operation.body.data.readable){
    const requestData = operation.body.data.read();
    try {
      // Parse body of request and check if it is structurally correct
      const mintRequest = MintRequestParser.parseMintRequest(requestData);

      // Authenticate requestor via DPOP
      const credentials: CredentialSet = await this.credentialsExtractor.handleSafe(request);
      this.logger.info(`Extracted credentials: ${JSON.stringify(credentials)}`);
      const {requestor, mode} = mintRequest;
      if(credentials.agent?.webId !== undefined && requestor.toString() !== credentials.agent!.webId){
        throw new Error("Invalid credentials !");
      }
      // Check if requestor is authorized via WAC to access the requested resource to mint a token for
      const {resourceURI} = mintRequest;
      const requestedModes = new IdentifierSetMultiMap<AccessMode>()
        .add({path: resourceURI.toString()},AccessMode[mode as keyof typeof AccessMode]);

      const availablePermissions = await this.permissionReader.handleSafe({ credentials, requestedModes });
      this.logger.info(`Available permissions are ${JSON.stringify(availablePermissions)}`);

      try {
        await this.authorizer.handleSafe({ credentials, requestedModes, availablePermissions });
        operation.availablePermissions = availablePermissions;
        this.logger.verbose(`Authorization succeeded !`);
      } catch (error: unknown) {
        this.logger.verbose(`Authorization failed: ${(error as any).message}`);
        throw error;
      }

      // Mint a root macaroon that gives delegation rights to the minter for the requested resource and mode
      const mintedMacaroon = await new MacaroonMinter().mintMacaroon(mintRequest);
      const responseData = guardedStreamFrom(JSON.stringify({mintedMacaroon: mintedMacaroon}));
      const response = new OkResponseDescription(new RepresentationMetadata(),responseData)
      this.logger.info("Minted macaroon for : " + requestor);
      return response;

    } catch (error) {
      throw error;
    }
  }else{
    throw new Error("Invalid request body !");
  }
}
}