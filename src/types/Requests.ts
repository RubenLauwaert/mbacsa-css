import { RSA_JWK } from "pem-jwk";
import { WebID } from "../util/Util";


export interface MintRequest {
  resourceURI: string,
  requestor: WebID,
  requestedAccessMode: string,
  dischargeKey: RSA_JWK;
}

export interface DischargeRequest {
  
  serializedMacaroon: string,
  agentToDischarge: WebID
}

export interface PublicKeyDischargeRequest {
  subjectToRetrieveKeyFrom: WebID
}

export interface RevocationRequest {

  serializedMacaroons: Array<string>,
  resourceOwner: WebID,
  revoker: WebID,
  revokee: WebID
}