import { Credential } from "@solid/community-server"

export interface RevocationRequest {

  serializedMacaroons: Array<string>,
  revoker: string,
  revokee: string
}