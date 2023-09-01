import { Credential } from "@solid/community-server"

export interface RevocationRequest {

  serializedMacaroons: Array<string>,
  resourceOwner: string,
  revoker: string,
  revokee: string
}