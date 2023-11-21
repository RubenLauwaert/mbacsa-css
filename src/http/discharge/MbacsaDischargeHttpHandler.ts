import { ResponseDescription,
  getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler, ensureTrailingSlash, 
  OkResponseDescription, guardedStreamFrom, Guarded, RepresentationMetadata, Representation, CredentialsExtractor } from '@solid/community-server';
import { DischargeRequestParser } from '../parse/DischargeRequestParser';
import { MacaroonDischarger } from './MbacsaDischarger';
import { extractPathToPod } from '../../util/Util';
import { MacaroonKeyManager } from '../../mbacsa/MbacsaKeyManager';
import { pem2jwk } from 'pem-jwk';
import { PublicDischargeKeyResponse } from '../../types/Responses';



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
      this.logger.info("Attempting to discharge a macaroon!")
      return;
    }
    else if(target.path.endsWith('/key')){
      this.logger.info("Attempting to retrieve public discharge key")
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
  const {target, body,} = input.operation;
  if(target.path.endsWith('/key')){
    if(DischargeRequestParser.isRequestBodyReadable(body)){
      const startTime = process.hrtime();      // 1. Parse body of request
      const requestBody = body.data.read();
      const {subjectToRetrieveKeyFrom} = DischargeRequestParser.parsePublicKeyRequest(requestBody);
      // 2. Retrieve public discharge key from pod of subject to retrieve from
      const pathToRootOfSubject = extractPathToPod(subjectToRetrieveKeyFrom);
      const pemPublicDischargeKey = new MacaroonKeyManager(pathToRootOfSubject).getPublicDischargeKey();
      const jwkPublicDischargeKey = pem2jwk(pemPublicDischargeKey);
      // 3. Construct response
      const publicDischargeKeyResponse:PublicDischargeKeyResponse = {dischargeKey:jwkPublicDischargeKey}
      const responseData = guardedStreamFrom(JSON.stringify(publicDischargeKeyResponse));
      const endTime = process.hrtime(startTime);
      const elapsedTimeMicroseconds = endTime[0] * 1e6 + endTime[1] / 1e3;
      this.logger.info(`It took ${elapsedTimeMicroseconds} microseconds to retrieve discharge key !`)
      this.logger.info("Successfully shared public discharge key of : " + subjectToRetrieveKeyFrom);
      return new OkResponseDescription(new RepresentationMetadata(),responseData);
    }else{
      throw new Error("Request body is not readable !");
    }
  }else{
    // 1. Parse body of request
    const dischargeRequest = DischargeRequestParser.parseDischargeRequest(body);
    // 2. Authenticate agent to discharge via DPoP 
    const credentials = await this.credentialsExtractor.handleSafe(input.request)
    const authenticatedAgent = credentials.agent?.webId
    const { thirdPartyCaveatIdentifier, agentToDischarge } = dischargeRequest;
    if(authenticatedAgent !== agentToDischarge){throw new Error("The authenticated agent is not equal to the agent that requests a discharge !")}
    // 3. Generate Discharge Macaroon
    const serializedDischargeMacaroon = MacaroonDischarger.generateDischargeMacaroon(thirdPartyCaveatIdentifier,agentToDischarge,this.baseDischargeUrl);
    const responseData = guardedStreamFrom(JSON.stringify({dischargeMacaroon: serializedDischargeMacaroon}));
    const response = new OkResponseDescription(new RepresentationMetadata(),responseData)
    this.logger.info("Successfully generated a delegation token (discharge macaroon) for " + dischargeRequest.agentToDischarge)
    return response;
  }
  
}

}