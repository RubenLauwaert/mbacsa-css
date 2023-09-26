import { WebID } from "../util/Util";

export interface RevocationStatement {
  revokee: WebID,
  positionRevokee: number
}