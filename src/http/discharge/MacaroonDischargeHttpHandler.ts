import { ResponseDescription,
  getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler, ensureTrailingSlash, 
  OkResponseDescription, guardedStreamFrom, Guarded, RepresentationMetadata, Representation, CredentialsExtractor } from '@solid/community-server';
import { DischargeRequestParser } from './DischargeRequestParser';
import { MacaroonDischarger } from './MacaroonDischarger';


export interface MacaroonDischargeHttpHandlerArgs {
  /**
   * Extracts the credentials from the incoming request.
   */
  credentialsExtractor: CredentialsExtractor,
  baseUrl : string,
  endpoint : string 
}



export class MacaroonDischargeHttpHandler extends OperationHttpHandler {
private readonly logger = getLoggerFor(this);
private readonly credentialsExtractor:CredentialsExtractor;
private readonly baseUrl:string;
private readonly endpoint:string;
private readonly baseDischargeUrl:string;

public constructor(args: MacaroonDischargeHttpHandlerArgs) {
super();
this.credentialsExtractor = args.credentialsExtractor;
this.baseUrl = ensureTrailingSlash(args.baseUrl);
this.endpoint = args.endpoint;
this.baseDischargeUrl = this.baseUrl + this.endpoint;
}

public async canHandle(input: OperationHttpHandlerInput): Promise<void> {
  const {target, body} = input.operation;  


  if(target.path.includes(this.baseDischargeUrl)){
    // Request to discharge a macaroon
    if(target.path === this.baseDischargeUrl){
      this.logger.warn("Attempting to discharge a macaroon!")
      return;
    }
    else if(target.path.endsWith('/key')){
      this.logger.warn("Attempting to retrieve public discharge key")
      return;
    }
    else{
      throw new Error("Not a valid discharge endpoint !")
    }
  }else {
    throw new Error("Not a valid discharge endpoint !")
  } 
}


public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
  const {target, body} = input.operation;
  if(target.path.endsWith('/key')){
    // Generate response containing public discharge key
    const publicDischargeKeyRequest = DischargeRequestParser.parsePublicKeyRequest(body);
    const response = new OkResponseDescription(new RepresentationMetadata(), guardedStreamFrom("valid request !"));
    return response;
  }else{
    // Generate response that carries the rootMacaroon and corresponding discharge macaroon
    const dischargeRequest = DischargeRequestParser.parseDischargeRequest(body);
    const serializedDischargeMacaroon = new MacaroonDischarger(this.baseDischargeUrl).generateDischargeMacaroon(dischargeRequest);
    const responseData = guardedStreamFrom(serializedDischargeMacaroon);
    const response = new OkResponseDescription(new RepresentationMetadata(),responseData)
    return response;
  }
  
}

}