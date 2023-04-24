import { ensureTrailingSlash, getLoggerFor } from "@solid/community-server";
import { MintRequest } from "./MintRequest";
import { MacaroonsBuilder } from "macaroons.js";
import NodeRSA from "node-rsa";
import { v4 as uuidv4 } from 'uuid';
import {jwk2pem} from 'pem-jwk';


export class MacaroonMinter {

  private readonly logger = getLoggerFor(this);

  public constructor(){

  }

  public async mintMacaroon(mintRequest : MintRequest):Promise<string>{
    const {resourceURI, requestor, dischargeKey} = mintRequest;

    const location = resourceURI;
    const identifier = uuidv4();
    const secretKey = uuidv4();

    
    // TODO: identifier and secret key of root macaroon should be saved in MacaroonStore

    // Generate root macaroon
    const rm = new MacaroonsBuilder(location,secretKey,identifier);

    // - Add third-party caveat, used for discharging the requestor (proof of identity)
    const dischargeLocation = ensureTrailingSlash(location.split("/^(?:[^\/]*\/){3}([^\/]*)/")[0]);
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