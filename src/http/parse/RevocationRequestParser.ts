import { Representation } from "@solid/community-server";
import { RevocationRequest } from "../../types/Requests";
import {validate} from 'jsonschema';

const revocationRequestBodySchema = {
  type: "object",
  properties: {
    serializedMacaroons: { type: "array" },
    revoker: {type: "string"},
    revokee: {type: "string"}
  },
  required: ["serializedMacaroons", "revoker", "revokee"]
}


/**
 * Parses and validates revocation requests for macaroons.
 */
export class RevocationRequestParser {

  /**
   * Parses a revocation request from the given representation.
   * @param body The representation containing the revocation request.
   * @returns The parsed RevocationRequest object.
   * @throws An error if the request does not have a valid JSON Schema or is unreadable.
   */
  public static parseRevocationRequest(body: Representation):RevocationRequest{
    if(this.isRequestBodyReadable(body)){
      const jsonRequestString = body.data.read();
      const jsonRequest = JSON.parse(jsonRequestString)
      const validationResult = validate(jsonRequest, revocationRequestBodySchema);
      if(validationResult.valid){
        return {
          serializedMacaroons: jsonRequest.serializedMacaroons,
          resourceOwner: jsonRequest.resourceOwner,
          revoker: jsonRequest.revoker,
          revokee: jsonRequest.revokee
        } as RevocationRequest
      }else{
        throw new Error(validationResult.errors[0].message);
      }
    }else{
      throw new Error("Body of request is not readable !");
    }
  }


  /**
   * Checks if the given JSON string is a valid revocation request.
   * @param jsonRequestString The JSON string to validate.
   * @returns True if valid, false otherwise.
   */
  public static isValidRevocationRequest(jsonRequestString:string):boolean{
    try {
      const jsonRequest = JSON.parse(jsonRequestString);
      return validate(jsonRequest,revocationRequestBodySchema).valid;
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


}