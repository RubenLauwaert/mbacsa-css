import { getLoggerFor } from "@solid/community-server";
import { MintRequest } from "../../types/Requests";
import { validate } from "jsonschema";

const mintRequestBodySchema = {
  type: "object",
  properties: {
    resourceURI: { type: "string", format: "uri" },
    requestor: { type: "string", format: "uri" },
    requestedAccessMode: {type: "string"},
    // TODO: Add JWK scheme 
    dischargeKey: { type: "object" }
  },
  required: ["resourceURI", "requestor", "requestedAccessMode","dischargeKey"]
};



export class MintRequestParser {

  private readonly logger = getLoggerFor(this);

  public constructor(){

  }

  public static parseMintRequest(requestData:any):MintRequest{
    // Try to convert to JSON
    try {
      const jsonRequestData = JSON.parse(requestData);
      // Check JSON Schema is valid
      const isValidRequest = validate(jsonRequestData,mintRequestBodySchema).valid;
      if(isValidRequest){
        // Return MintRequest
        return jsonRequestData;
      }else{
        throw new Error ("Body of macaroon mint request doesn't have a valid JSON Schema !");
      }
    } catch (error) {
      throw new Error("Error in converting body of request to JSON !");
    }
  }


}