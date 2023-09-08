export interface DischargeRequest {
  
  serializedMacaroon: string,
  agentToDischarge: string
}

export interface PublicKeyDischargeRequest {
  subjectToRetrieveKeyFrom: string
}