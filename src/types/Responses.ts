import { RSA_JWK } from "pem-jwk";

/**
 * Represents the response for a discharge request.
 */
export interface DischargeResponse {
  /**
   * Serialized discharge macaroon.
   */
  dischargeMacaroon: string;
}

/**
 * Represents the response for a request to retrieve a public discharge key.
 */
export interface PublicDischargeKeyResponse {
  /**
   * The RSA JSON Web Key (JWK) used for discharging macaroons.
   */
  dischargeKey: RSA_JWK;
}

/**
 * Represents the response for a macaroon minting request.
 */
export interface MintResponse {
  /**
   * Serialized minted macaroon.
   */
  mintedMacaroon: string;
}

/**
 * Represents the response for a macaroon revocation request.
 */
export interface RevocationResponse {
  
}
