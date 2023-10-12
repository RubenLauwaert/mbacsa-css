import { RSA_JWK } from "pem-jwk";
import { WebID } from "../util/Util";
import { AccessMode } from "@solid/community-server";


export interface MintRequest {
  resourceURI: string,
  requestor: WebID,
  requestedAccessMode: string,
  dischargeKey: RSA_JWK;
  mode:string
}

export interface DischargeRequest {
  
  serializedRootMacaroon: string,
  agentToDischarge: WebID,
  mode?:string
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