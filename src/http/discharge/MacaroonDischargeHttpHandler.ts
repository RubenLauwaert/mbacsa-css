import { ResponseDescription,
  getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler, ensureTrailingSlash, 
  OkResponseDescription, guardedStreamFrom, Guarded, RepresentationMetadata, Representation } from '@solid/community-server';
import { DischargeRequest } from './DischargeRequest';


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
  // Check if URL of request matches the endpoint to discharge macaroons
  if(target.path !== this.dischargeUrl){
    throw new Error("URL of request doesn't match URL for discharging macaroons!")
  }
  // Check if data in body of request has the right format

  // Check if given macaroon is correct

  // Check if verified webId (via DPop or Bearer WebID) matches webId in macaroon

}


public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
const { request, operation } = input;
const responseData = guardedStreamFrom("Test");
const response = new OkResponseDescription(new RepresentationMetadata(),responseData)
return response;
}

}