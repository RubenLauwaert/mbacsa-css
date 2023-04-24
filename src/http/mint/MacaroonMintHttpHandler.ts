import { ResponseDescription,
  getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler, guardedStreamFrom, OkResponseDescription, RepresentationMetadata } from '@solid/community-server';
import { MintRequestParser } from './MintRequestParser';
import { MacaroonMinter } from './MacaroonMinter';

  export interface MacaroonMintHttpHandlerArgs {
    endpointURI : string 
  }

export class MacaroonMintHttpHandler extends OperationHttpHandler {
private readonly logger = getLoggerFor(this);
private readonly endpointURI : string;

public constructor(args: MacaroonMintHttpHandlerArgs) {
  super();
  this.endpointURI = args.endpointURI;
}

public async canHandle(input: OperationHttpHandlerInput): Promise<void> {
  const { operation } = input;

    if(!operation.target.path.includes(".macaroon/mint")){
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
  const requestData = operation.body.data.read();
  // Will throw an error if request dissatisfies JSON Schema
  const mintRequest = MintRequestParser.parseMintRequest(requestData);

  // Mint Macaroon 
  const mintedMacaroon = await new MacaroonMinter().mintMacaroon(mintRequest);
  const responseData = guardedStreamFrom(mintedMacaroon);
  const response = new OkResponseDescription(new RepresentationMetadata(),responseData)
  return response;
}
}