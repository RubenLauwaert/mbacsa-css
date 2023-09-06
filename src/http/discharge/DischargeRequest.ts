export interface DischargeRequest {
  
  serializedMacaroon: string,
  publicKey: string,
  agentToDischarge: string
}

export interface PublicKeyDischargeRequest {
  agentToDischarge: string
}