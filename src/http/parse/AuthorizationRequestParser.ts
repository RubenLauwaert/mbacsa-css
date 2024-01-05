import { AccessMode, Representation, getLoggerFor } from "@solid/community-server";
import { DischargeRequest, MbacsaAuthorizationRequest, PublicKeyDischargeRequest } from "../../types/Requests";
import {validate} from 'jsonschema';

const authorizationRequestBodySchema = {
  type: "object",
  properties: {
    serializedDischargeMacaroons: { type: "array" },
    body: {}},
  required: ["serializedDischargeMacaroons"]
};



/**
 * Parses and validates authorization requests for MBACSA (Macaroon-Based Access Control System Authorization).
 */
export class AuthorizationRequestParser {


  /**
   * Parses and validates the body of an MBACSA authorization request.
   * @param body - The body of the HTTP request to be parsed.
   * @returns The parsed MbacsaAuthorizationRequest object if valid, otherwise undefined.
   * @throws Error if the body is not readable or does not conform to the expected schema.
   */
  public static parseMbacsaAuthorizationRequest(body: Representation):MbacsaAuthorizationRequest|undefined {
    if(body.data.readable){
      const bodyString = body.data.read();
      try {
        const jsonBody = JSON.parse(bodyString);
        if(validate(jsonBody,authorizationRequestBodySchema).valid){
          return jsonBody;
        }
      } catch (error) {
        throw new Error("Body is not a valid body for authorizing request via MBACSA !");
      }
    }else{
      throw new Error("Could not read the body for authorizing request via MBACSA !");
    }
  }

}