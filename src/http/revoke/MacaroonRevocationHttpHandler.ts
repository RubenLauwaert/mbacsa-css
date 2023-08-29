import { CredentialSet, CredentialsExtractor, Authorizer, PermissionReader, ModesExtractor, ResponseDescription,
    getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler, UnauthorizedHttpError, NotImplementedHttpError, ensureTrailingSlash } from '@solid/community-server';
import { AuthorizingHttpHandlerArgs } from '@solid/community-server';


export interface MacaroonRevocationHttpHandlerArgs {
  /**
   * Extracts the credentials from the incoming request.
   */
  credentialsExtractor: CredentialsExtractor,
  baseUrl : string,
  endpoint : string 
}




export class MacaroonRevocationHttpHandler extends OperationHttpHandler {
private readonly logger = getLoggerFor(this);

private readonly credentialsExtractor: CredentialsExtractor;
private readonly baseUrl:string;
private readonly endpoint:string;
private readonly revokeUrl:string;

public constructor(args: MacaroonRevocationHttpHandlerArgs) {
  super();
  this.credentialsExtractor = args.credentialsExtractor;
  this.baseUrl = ensureTrailingSlash(args.baseUrl);
  this.endpoint = args.endpoint;
  this.revokeUrl = this.baseUrl + this.endpoint;
}


public async canHandle(input: OperationHttpHandlerInput): Promise<void> {
  const {target, body} = input.operation;  

  // Check if URL of request matches the endpoint to discharge macaroons
  if(target.path !== this.revokeUrl){
    throw new Error("URL of request doesn't match URL for revoking macaroons!")
  }
}

public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
  const { request, operation } = input;
  const { headers } = request;
  const { target } = operation;
  throw new NotImplementedHttpError("Revocation is not implemented yet !");
}
}