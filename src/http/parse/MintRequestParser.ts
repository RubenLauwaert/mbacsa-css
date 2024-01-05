import { AccessMode, getLoggerFor } from "@solid/community-server";
import { MintRequest } from "../../types/Requests";
import { validate } from "jsonschema";

const mintRequestBodySchema = {
  type: "object",
  properties: {
    resourceURI: { type: "string", format: "uri" },
    requestor: { type: "string", format: "uri" },
    dischargeKey: { type: "object" },
    mode: {type: "string", enum: [AccessMode.read, AccessMode.append, AccessMode.write, AccessMode.create, AccessMode.write]}
  },
  required: ["resourceURI", "requestor","dischargeKey", "mode"]
};


/**
 * Parses and validates mint requests for macaroons.
 */
export class MintRequestParser {

  private readonly logger = getLoggerFor(this);

  /**
   * Parses a mint request from the given data.
   * @param requestData The data containing the mint request.
   * @returns The parsed MintRequest object.
   * @throws An error if the request data does not have a valid JSON Schema or cannot be converted to JSON.
   */
  public static parseMintRequest(requestData:any):MintRequest{
    // Try to convert to JSON
    try {
      const jsonRequestData = JSON.parse(requestData);
      // Check whether JSON Schema is valid
      const isValidRequest = validate(jsonRequestData,mintRequestBodySchema).valid;
      if(isValidRequest){
        // Return MintRequest
        return jsonRequestData as MintRequest;
      }else{
        throw new Error ("Body of macaroon mint request doesn't have a valid JSON Schema !");
      }
    } catch (error) {
      throw new Error("Error in converting body of request to JSON !");
    }
  }


}