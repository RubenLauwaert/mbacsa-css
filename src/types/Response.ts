import { RSA_JWK } from "pem-jwk";

/**
 * 
 */
export interface DischargeResponse {

}

/**
 * 
 */
export interface publicDischargeKeyResponse {
  dischargeKey: RSA_JWK,
}

/**
 * 
 */

export interface MintResponse {

}

/**
 * 
 */
export interface RevocationResponse {
  success: boolean
  error?: string,
  message?: string
}