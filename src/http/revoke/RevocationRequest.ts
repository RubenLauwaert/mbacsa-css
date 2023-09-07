
export interface RevocationRequest {

  serializedMacaroons: Array<string>,
  resourceOwner: string,
  revoker: string,
  revokee: string
}