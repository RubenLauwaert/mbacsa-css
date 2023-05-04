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
private readonly dischargeUrl:string;

public constructor(args: MacaroonDischargeHttpHandlerArgs) {
super();
this.credentialsExtractor = args.credentialsExtractor;
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

  // Check if verified web_id is equal to web_id in body
  const credentialSet = await this.credentialsExtractor.handleSafe(input.request);
  try {
  //const {agentToDischarge } = DischargeRequestParser.parseDischargeRequest(input.operation.body);
  this.logger.info(JSON.stringify(credentialSet));
  // if(agentToDischarge !== credentialSet.agent!.webId){
  //   throw new Error("Web id of agent that needs discharge macaroon doesn't match verified identity !");
  // }  
  } catch (error) {
    throw new Error("Body of request doesn't have the right format!");
  }
  
  // Check if content-type header matches 'application/json'
  if(input.request.headers['content-type']! !== "application/json"){  
    throw new Error("Content type doesn't match 'application/json' !");
  }
}


public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
const { request, operation } = input;
// Generate response that carries the rootMacaroon and corresponding discharge macaroon
const dischargeRequest = DischargeRequestParser.parseDischargeRequest(input.operation.body);
const serializedDischargeMacaroon = new MacaroonDischarger(this.dischargeUrl).generateDischargeMacaroon(dischargeRequest);
const responseData = guardedStreamFrom(serializedDischargeMacaroon);
const response = new OkResponseDescription(new RepresentationMetadata(),responseData)
return response;
}

}