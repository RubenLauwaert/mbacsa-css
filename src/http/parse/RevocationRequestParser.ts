import { Representation } from "@solid/community-server";
import { RevocationRequest } from "../../types/Requests";
import {validate} from 'jsonschema';

const revocationRequestBodySchema = {
  type: "object",
  properties: {
    serializedMacaroons: { type: "array" },
    resourceOwner: {type: "string"},
    revoker: {type: "string"},
    revokee: {type: "string"}
  },
  required: ["serializedMacaroons", "revoker", "revokee"]
}

export class RevocationRequestParser {


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
        }
      }else{
        throw new Error(validationResult.errors[0].message);
      }
    }else{
      throw new Error("Body of request is not readable !");
    }
  }



  public static isValidRevocationRequest(jsonRequestString:string):boolean{
    try {
      const jsonRequest = JSON.parse(jsonRequestString);
      return validate(jsonRequest,revocationRequestBodySchema).valid;
    } catch (error) {
      return false;
    }
  }



  public static isRequestBodyReadable(body: Representation){
    return body.data.readable;
  }


}