import { ensureTrailingSlash, getLoggerFor} from "@solid/community-server";
import { MintRequest } from "../../types/Requests";
import { MacaroonsBuilder } from "macaroons.js";
import NodeRSA from "node-rsa";
import { v4 as uuidv4 } from 'uuid';
import {jwk2pem} from 'pem-jwk';
import { MacaroonKeyManager } from "../../mbacsa/MbacsaKeyManager";
import { extractPathToPod, extractWebID } from "../../util/Util";


/**
 * The MacaroonMinter class is responsible for minting MBACSA specific macaroons.
 */
export class MacaroonMinter {

  private readonly logger = getLoggerFor(this);


  /**
   * Mints a new macaroon based on the provided mint request.
   * The method constructs a macaroon that includes both first-party and third-party caveats.
   * 
   * @param mintRequest - The request containing the following details for minting the macaroon:
   *   - resourceURI: The URI of the resource for which the macaroon is being minted.
   *   - requestor: The WebID of the entity requesting the macaroon.
   *   - requestedAccessMode: The access mode requested by the entity (e.g., read, write).
   *   - dischargeKey: The RSA JSON Web Key (JWK) of the requestor, used to encrypt third-party caveats.
   *   - mode: An additional mode parameter, possibly duplicating or supplementing 'requestedAccessMode'.
   * @returns A promise that resolves to the serialized macaroon.
   */
  public async mintMacaroon(mintRequest : MintRequest):Promise<string>{
    const {resourceURI, requestor, mode, dischargeKey} = mintRequest;
    const location = resourceURI;
    const identifier = uuidv4();
    const issuer = extractWebID(resourceURI);
    const positionIssuer = 1;
    const rootOfIssuer = extractPathToPod(resourceURI);
    const secretKey = new MacaroonKeyManager(rootOfIssuer).getSecretRootKey();
    // Add issuer to root macaroon as first-party caveat
    const rm = new MacaroonsBuilder(location,secretKey,identifier)
      .add_first_party_caveat(`issuer = ${issuer}`)

    // Add requested access mode to macaroon
    rm.add_first_party_caveat(`mode = ${mode}`)

    // Add time constraints (Macaroon is valid for 24h)
    const oneHourLater = new Date();
    oneHourLater.setHours(oneHourLater.getHours() + 24);
    rm.add_first_party_caveat(`time < ${oneHourLater.getTime()}`);

        
    // - Add third-party caveat, used for discharging the requestor (proof of identity)
    const dischargeLocation = ensureTrailingSlash(new URL(requestor).origin) + ".macaroon/discharge";
    const caveatKey = uuidv4();
    const agentPredicate = `agent = ${requestor}`;
    const modePredicate  = `mode = ${mode}`;
    const positionPredicate = `position = ${positionIssuer}`
    const tpCaveatId = caveatKey + "::" + agentPredicate + "::" + modePredicate
        + "::" + positionPredicate;
    // -- Encrypt third-party caveatId with given discharge key (public key of requestor)
    const rsa = new NodeRSA();
    const publicDischargeKeyPem = jwk2pem(dischargeKey);
    const key = rsa.importKey(publicDischargeKeyPem);
    const encryptedTpCaveatId = key.encrypt(tpCaveatId,'base64').toString();

    const am = rm.add_third_party_caveat(dischargeLocation,caveatKey,encryptedTpCaveatId)
                 .getMacaroon();

    return am.serialize();
  }



}