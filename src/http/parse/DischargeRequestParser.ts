import { Representation, getLoggerFor } from "@solid/community-server";
import { DischargeRequest, PublicKeyDischargeRequest } from "../../types/Requests";
import {validate} from 'jsonschema';


const dischargeRequestBodySchema = {
  type: "object",
  properties: {
    thirdPartyCaveatIdentifier: { type: "string" },
    agentToDischarge: { type: "string" },  },
  required: ["thirdPartyCaveatIdentifier", "agentToDischarge"]
};

const publicDischargeKeyRequestSchema = {
  type: "object",
  properties: {
    subjectToRetrieveKeyFrom: {type: "string"},
  },
  required: ["subjectToRetrieveKeyFrom"]
}


/**
 * Parses and validates discharge requests and public discharge key requests.
 */
export class DischargeRequestParser {


  private readonly logger = getLoggerFor(this)


  /**
   * Parses a discharge request from the given representation.
   * @param body The representation containing the discharge request.
   * @returns The parsed DischargeRequest object.
   * @throws An error if the request does not have the correct JSON schema or is unreadable.
   */
  public static parseDischargeRequest(body: Representation):DischargeRequest {
    if(this.isRequestBodyReadable(body)){
      const jsonRequestString = body.data.read();
      if(this.isValidDischargeRequest(jsonRequestString)){
        const jsonRequest = JSON.parse(jsonRequestString);
        return jsonRequest as DischargeRequest;
      }else{
        throw new Error("Request doesn't have the right JSON schema !");
      }
    }else{
      throw new Error("Body of request is not readable !");
    }
  }

  /**
   * Checks if the given JSON string is a valid discharge request.
   * @param jsonRequestString The JSON string to validate.
   * @returns True if valid, false otherwise.
   */
  public static isValidDischargeRequest(jsonRequestString:string):boolean{
    try {
      const jsonRequest = JSON.parse(jsonRequestString);
      return validate(jsonRequest,dischargeRequestBodySchema).valid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if the body of a representation is readable.
   * @param body The representation to check.
   * @returns True if readable, false otherwise.
   */
  public static isRequestBodyReadable(body: Representation){
    return body.data.readable;
  }

  /**
   * Checks if the given representation is a valid public key request.
   * @param body The representation containing the request.
   * @returns True if valid, false otherwise.
   */
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

  /**
   * Parses a public key discharge request from the given body.
   * @param requestBody The body containing the public key request.
   * @returns The parsed PublicKeyDischargeRequest object.
   * @throws An error if the request does not have the correct format or cannot be parsed.
   */
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