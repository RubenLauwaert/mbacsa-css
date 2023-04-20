export interface DischargeRequest {
  
  serializedMacaroon: string,
  publicKey: string,
  agentToDischarge: string
}