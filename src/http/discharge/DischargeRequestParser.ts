import { Representation } from "@solid/community-server";
import { DischargeRequest } from "./DischargeRequest";
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


}