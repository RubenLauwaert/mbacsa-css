import { ensureTrailingSlash, getLoggerFor} from "@solid/community-server";
import { MintRequest } from "./MintRequest";
import { MacaroonsBuilder } from "macaroons.js";
import NodeRSA from "node-rsa";
import { v4 as uuidv4 } from 'uuid';
import {jwk2pem} from 'pem-jwk';
import { MacaroonKeyManager } from "../../macaroons/MacaroonKeyManager";
import { extractPathToPod, extractWebID } from "../../util/Util";


export class MacaroonMinter {

  private readonly logger = getLoggerFor(this);

  public constructor(){

  }

  public async mintMacaroon(mintRequest : MintRequest):Promise<string>{
    const {resourceURI, requestor, dischargeKey} = mintRequest;

    const location = resourceURI;
    const identifier = uuidv4();
    const issuer = extractWebID(resourceURI);
    const secretKey = new MacaroonKeyManager().getSecretRootKey();

    // Extract issuer WebID from resourceURI;
    
    this.logger.info(extractPathToPod(resourceURI));

    // Add issuer to root macaroon as first-party caveat
    const rm = new MacaroonsBuilder(location,secretKey,identifier)
      .add_first_party_caveat(`issuer = ${issuer}`)

    // Add time constraints (Macaroon is valid for 24h)
    const oneHourLater = new Date();
    oneHourLater.setHours(oneHourLater.getHours() + 24);
    rm.add_first_party_caveat(`time < ${oneHourLater.getTime()}`);

        
    // - Add third-party caveat, used for discharging the requestor (proof of identity)
    const dischargeLocation = ensureTrailingSlash(new URL(requestor).origin) + ".macaroon/discharge";
    this.logger.info(dischargeLocation);
    const caveatKey = uuidv4();
    const predicate = `agent = ${requestor}`;
    const tpCaveatId = caveatKey + "::" + predicate;
    // -- Encrypt third-party caveatId with given discharge key (public key of requestor)
    const rsa = new NodeRSA();
    const key = rsa.importKey(jwk2pem(dischargeKey));
    const encryptedTpCaveatId = key.encrypt(tpCaveatId,'base64').toString();

    const am = rm.add_third_party_caveat(dischargeLocation,caveatKey,encryptedTpCaveatId)
                 .getMacaroon();

    return am.serialize();
  }



}