import { RSA_JWK } from "pem-jwk";
import { WebID } from "../util/Util";

/**
 * Represents a request for minting a macaroon.
 */
export interface MintRequest {
  /**
   * The URI of the resource for which the macaroon is being minted.
   */
  resourceURI: string;

  /**
   * The WebID of the entity requesting the macaroon.
   */
  requestor: WebID;

  /**
   * The access mode requested by the entity. This is a legacy field and may be deprecated.
   */
  requestedAccessMode: string;

  /**
   * The RSA JSON Web Key (JWK) of the requestor, used for discharging the macaroon.
   */
  dischargeKey: RSA_JWK;

  /**
   * The access mode for which the macaroon is being requested.
   */
  mode: string;
}

/**
 * Represents a request for discharging a macaroon.
 */
export interface DischargeRequest {
  /**
   * The unique identifier for the third-party caveat.
   */
  thirdPartyCaveatIdentifier: string;

  /**
   * The WebID of the agent for whom the discharge macaroon is being requested.
   */
  agentToDischarge: WebID;

  /**
   * The serialized root macaroon, if provided.
   */
  serializedRootMacaroon?: string;

  /**
   * The attenuated mode for which the discharge macaroon is being requested.
   */
  mode?: string;
}

/**
 * Represents a request for a public key needed for discharging a macaroon.
 */
export interface PublicKeyDischargeRequest {
  /**
   * The WebID of the subject from whom the public key is to be retrieved.
   */
  subjectToRetrieveKeyFrom: WebID;
}

/**
 * Represents an authorization request for MBACSA.
 */
export interface MbacsaAuthorizationRequest {
  /**
   * Array of serialized discharge macaroons. Located in body since header is space limited
   */
  serializedDischargeMacaroons: Array<string>;

  /**
   * Optional additional body data for the authorization request (append, write) requests.
   */
  body?: any;
}

/**
 * Represents a request for revoking a macaroon.
 */
export interface RevocationRequest {
  /**
   * Array of root macaroon and associated discharge proofs.
   */
  serializedMacaroons: Array<string>;

  /**
   * The WebID of the owner of the resource for which the root macaroon was issued.
   */
  resourceOwner: WebID;

  /**
   * The WebID of the agent initiating the revocation.
   */
  revoker: WebID;

  /**
   * The WebID of the agent whose access is being revoked.
   */
  revokee: WebID;
}
