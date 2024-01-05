import { WebID } from "../util/Util";

/**
 * Represents a statement for revoking access in MBACSA.
 */
export interface RevocationStatement {
  /**
   * The WebID of the agent (revokee) whose access is being revoked.
   */
  revokee: WebID;

  /**
   * The position of the revokee in the delegation chain.
   * This is used to identify the specific discharge macaroon in the delegation chain that is being revoked.
   */
  positionRevokee: number;
}
