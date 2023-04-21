import { ResponseDescription,
  getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler, ensureTrailingSlash, 
  OkResponseDescription, guardedStreamFrom, Guarded, RepresentationMetadata, Representation } from '@solid/community-server';
import { DischargeRequestParser } from './DischargeRequestParser';
import { MacaroonDischarger } from './MacaroonDischarger';


export interface MacaroonDischargeHttpHandlerArgs {
  baseUrl : string,
  endpoint : string 
}



export class MacaroonDischargeHttpHandler extends OperationHttpHandler {
private readonly logger = getLoggerFor(this);
private readonly baseUrl:string;
private readonly endpoint:string;
private readonly dischargeUrl:string;

public constructor(args: MacaroonDischargeHttpHandlerArgs) {
super();
this.baseUrl = ensureTrailingSlash(args.baseUrl);
this.endpoint = args.endpoint;
this.dischargeUrl = this.baseUrl + this.endpoint;
}

public async canHandle(input: OperationHttpHandlerInput): Promise<void> {
  const {target, body} = input.operation;  
  this.logger.info(input.request.headers['content-type']!);
  // Check if URL of request matches the endpoint to discharge macaroons
  if(target.path !== this.dischargeUrl){
    throw new Error("URL of request doesn't match URL for discharging macaroons!")
  }
  // Check if content-type header matches 'application/json'
  if(input.request.headers['content-type']! !== "application/json"){  
    throw new Error("Content type doesn't match 'application/json' !");
  }
  // Check if data in body of request has the right format
  this.logger.warn("[TODO] : Check if body of request has right format !");
  // Check if verified webId (via DPop or Bearer WebID) matches webId in macaroon
  this.logger.warn("[TODO] : Check if verified web_id (via DPoP / Bearer) equals given web_id in request / macaroon");
}


public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
const { request, operation } = input;
// Generate response that carries the rootMacaroon and corresponding discharge macaroon
const dischargeRequest = DischargeRequestParser.parseDischargeRequest(input.operation.body);
const serializedDischargeMacaroon = new MacaroonDischarger(this.baseUrl).generateDischargeMacaroon(dischargeRequest);
const responseData = guardedStreamFrom(serializedDischargeMacaroon);
const response = new OkResponseDescription(new RepresentationMetadata(),responseData)
return response;
}

}