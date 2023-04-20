import { DischargeRequest } from "./DischargeRequest";
import {MacaroonsBuilder, MacaroonsDeSerializer } from "macaroons.js";
import {DischargeKeyManager} from "./DischargeKeyManager";
import { getLoggerFor } from "@solid/community-server";

export class MacaroonDischarger {

  private readonly logger = getLoggerFor(this);



  public generateDischargeMacaroon(dischargeRequest:DischargeRequest){
    const {serializedMacaroon, publicKey, agentToDischarge} = dischargeRequest;
    // Deserialize macaroon
    const deserializedMacaroon = MacaroonsDeSerializer.deserialize(serializedMacaroon);
    this.logger.info(deserializedMacaroon.inspect());
    // Decrypt third-party cId with corresponding private key of generated keypair

    // Get private key
    //this.logger.info(DischargeKeyManager.getPrivateKey().toString());

    // Create new discharge macaroon
  }


}