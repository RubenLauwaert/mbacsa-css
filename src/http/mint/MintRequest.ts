import { RSA_JWK } from "pem-jwk";

export interface MintRequest {
  resourceURI: string,
  requestor: string,
  requestedAccessMode: string,
  dischargeKey: RSA_JWK;
}