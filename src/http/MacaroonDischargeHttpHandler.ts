import { ResponseDescription,
  getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler, ensureTrailingSlash, 
  OkResponseDescription, guardedStreamFrom, Guarded, RepresentationMetadata } from '@solid/community-server';


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
    const {operation,} = input;  
  if(operation.target.path === this.dischargeUrl){
    this.logger.info("This request can be handled by the Macaroon Discharger !");
    const data:string|any = operation.body.data.read();
    try {
      const parsedData = JSON.parse(data);
      this.logger.info(parsedData.webId);
    } catch (error) {
      this.logger.info("Couldn't transform to JSON")
    }

  }
}


public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
const { request, operation } = input;
const responseData = guardedStreamFrom("Test");
const response = new OkResponseDescription(new RepresentationMetadata(),responseData)
return response;
}
}