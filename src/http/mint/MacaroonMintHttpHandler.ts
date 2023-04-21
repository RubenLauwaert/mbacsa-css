import { ResponseDescription,
  getLoggerFor, OperationHttpHandlerInput, OperationHttpHandler } from '@solid/community-server';

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
    if(!input.operation.target.path.includes(".macaroon/mint")){
      throw new Error();
    }
}


public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
const { request, operation } = input;
throw new Error("This handler is not implemented yet !");
}
}