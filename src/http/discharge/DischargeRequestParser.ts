import { Representation, getLoggerFor } from "@solid/community-server";
import { DischargeRequest, PublicKeyDischargeRequest } from "./DischargeRequest";
import {validate} from 'jsonschema';


const dischargeRequestBodySchema = {
  type: "object",
  properties: {
    serializedMacaroon: { type: "string" },
    agentToDischarge: { type: "string" }
  },
  required: ["serializedMacaroon", "agentToDischarge"]
};

const publicDischargeKeyRequestSchema = {
  type: "object",
  properties: {
    subjectToRetrieveKeyFrom: {type: "string"},
  },
  required: ["subjectToRetrieveKeyFrom"]
}



export class DischargeRequestParser {

  public constructor(){};
  private readonly logger = getLoggerFor(this)


  public static parseDischargeRequest(body: Representation):DischargeRequest {
    if(this.isRequestBodyReadable(body)){
      const jsonRequestString = body.data.read();
      if(this.isValidDischargeRequest(jsonRequestString)){
        const jsonRequest = JSON.parse(jsonRequestString);
        return jsonRequest;
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

  public static parsePublicKeyRequest(requestBody:any):PublicKeyDischargeRequest{
    try {
      const jsonRequest = JSON.parse(requestBody);
      if(validate(jsonRequest,publicDischargeKeyRequestSchema).valid){
        return jsonRequest;
      }else{
        throw new Error("Body of request does not have the right JSON format !")
      }
    } catch (error) {
      throw new Error("Body of request could not be parsed to JSON format !")
    }
  }

}