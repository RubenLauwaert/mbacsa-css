import { DischargeRequest } from "./DischargeRequest";
import {CaveatPacket, CaveatPacketType, Macaroon, MacaroonsBuilder, MacaroonsDeSerializer } from "macaroons.js";
import {DischargeKeyManager} from "./DischargeKeyManager";
import NodeRSA from 'node-rsa';
import { getLoggerFor } from "@solid/community-server";


export interface ThirdPartyCaveat {
  encryptedCaveat: string;
  caveatKey: string;
  predicate: string;
}



export class MacaroonDischarger {

  private readonly logger = getLoggerFor(this);
  private readonly baseUrl:string; 

  public constructor(baseUrl:string){
    this.baseUrl = baseUrl;
  }

  private filterThirdPartyCaveats(macaroon:Macaroon):CaveatPacket[]{
    const {caveatPackets} = macaroon;
    const filteredCaveatPackets:CaveatPacket[] = [];
    for(const caveatPacket of caveatPackets){
      const caveatPacketIndex = caveatPackets.indexOf(caveatPacket);
      //Check if caveat is of cid type
      if(caveatPacket.type === 3){
        if(caveatPacketIndex + 2 >= caveatPackets.length){break;}
        // Check if next element is of vid type
        if(caveatPackets[caveatPacketIndex + 1].type !== 4){continue;}
        // Check if second next element is of cl type
        if(caveatPackets[caveatPacketIndex + 2].type !== 5){continue;}
        // Check if caveat location equals the baseUrl of this Community server
        if(caveatPackets[caveatPacketIndex + 2].getValueAsText() !== this.baseUrl){continue;}
        // Caveat packet is a third-party caveat for this location --> add
        filteredCaveatPackets.push(caveatPacket);
      }
    }
    return filteredCaveatPackets;
  }

  private getDecryptedCaveatToDischarge(filteredCaveatPackets : CaveatPacket[], agentToDischarge:string):ThirdPartyCaveat{
    
    for(const caveatPacket of filteredCaveatPackets){
      try{
        const decryptedCaveatId = DischargeKeyManager.decrypt(caveatPacket.getValueAsText());
        // Example of decrypted caveatId : "CAVEATKEY::predicate"
        if(decryptedCaveatId.includes("::")){
          const [caveatKey,predicate] = decryptedCaveatId.split("::");
          if(predicate === `agent = ${agentToDischarge}`){
            return { caveatKey:caveatKey, predicate:predicate, encryptedCaveat: caveatPacket.getValueAsText()};
          }
        }
      }catch(error){
        continue;
      }
    }
    throw new Error(`Could not find a corresponding caveatId to discharge for the agent : ${agentToDischarge}`);
  }



  public generateDischargeMacaroon(dischargeRequest:DischargeRequest): string{
    const {serializedMacaroon, publicKey, agentToDischarge} = dischargeRequest;
    // Deserialize macaroon
    const deserializedMacaroon = MacaroonsDeSerializer.deserialize(serializedMacaroon);
    //this.logger.info(JSON.stringify(deserializedMacaroon.caveatPackets));
    // Filter Third-Party caveatPackets that have the same caveat location as this server
    const filteredCaveatPackets = this.filterThirdPartyCaveats(deserializedMacaroon);
    // Decrypt third-party cId with corresponding private key of generated keypair
    const {caveatKey,predicate, encryptedCaveat} = this.getDecryptedCaveatToDischarge(filteredCaveatPackets,agentToDischarge);
    // Create new discharge macaroon
    return new MacaroonsBuilder(this.baseUrl,caveatKey,encryptedCaveat)
            .getMacaroon().serialize();

  }
}