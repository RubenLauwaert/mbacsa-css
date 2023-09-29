import { RSA_JWK } from "pem-jwk";

/**
 * 
 */
export interface DischargeResponse {
  dischargeMacaroon: string
}

/**
 * 
 */
export interface PublicDischargeKeyResponse {
  dischargeKey: RSA_JWK,
}

/**
 * 
 */

export interface MintResponse {
  mintedMacaroon: string
}

/**
 * 
 */
export interface RevocationResponse {

}