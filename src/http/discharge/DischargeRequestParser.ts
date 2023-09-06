import { Representation } from "@solid/community-server";
import { DischargeRequest, PublicKeyDischargeRequest } from "./DischargeRequest";
import {validate} from 'jsonschema';


const dischargeRequestBodySchema = {
  type: "object",
  properties: {
    serializedMacaroon: { type: "string" },
    publicKey: { type: "string" },
    agentToDischarge: { type: "string" }
  },
  required: ["serializedMacaroon", "publicKey", "agentToDischarge"]
};

const publicDischargeKeyRequestSchema = {
  type: "object",
  properties: {
    agentToDischarge: {type: "string"},
  },
  required: ["agentToDischarge"]
}



export class DischargeRequestParser {

  public static parseDischargeRequest(body: Representation):DischargeRequest {
    if(this.isRequestBodyReadable(body)){
      const jsonRequestString = body.data.read();
      if(this.isValidDischargeRequest(jsonRequestString)){
        const jsonRequest = JSON.parse(jsonRequestString);
        return {serializedMacaroon: jsonRequest.serializedMacaroon,
                agentToDischarge: jsonRequest.agentToDischarge,
                publicKey: jsonRequest.publicKey};
      }else{
        throw new Error("Request doesn't have the right JSON schema !");
      }
    }else{
      throw new Error("Body of request is not readable !");
    }
  }


  public static isValidDischargeRequest(jsonRequestString:string):boolean{
    try {
      const jsonRequest = JSON.parse(jsonRequestString);
      return validate(jsonRequest,dischargeRequestBodySchema).valid;
    } catch (error) {
      return false;
    }
  }

  public static isRequestBodyReadable(body: Representation){
    return body.data.readable;
  }

  public static isValidPublicKeyRequest(body:Representation):boolean{
    if(this.isRequestBodyReadable(body)){
      const jsonRequestString = body.data.read();
      try {
        const jsonRequest = JSON.parse(jsonRequestString);
        return validate(jsonRequest,publicDischargeKeyRequestSchema).valid;
      } catch (error) {
        return false;
      }
    }
    return false;
  }

  public static parsePublicKeyRequest(body: Representation):PublicKeyDischargeRequest{
    if(this.isValidPublicKeyRequest(body)){
      const jsonRequestString = body.data.read();
      return JSON.parse(jsonRequestString);
  
    }else{
      throw new Error("Body of request does not have the right schema to retrieve public discharge key!")
    }

  }

}