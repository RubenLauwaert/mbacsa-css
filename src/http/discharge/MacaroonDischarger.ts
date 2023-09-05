import { DischargeRequest } from "./DischargeRequest";
import {CaveatPacket, CaveatPacketType, Macaroon, MacaroonsBuilder, MacaroonsDeSerializer } from "macaroons.js";
import { getLoggerFor } from "@solid/community-server";
import { MacaroonKeyManager } from "../../macaroons/MacaroonKeyManager";
import { extractPathToPod } from "../../util/Util";


export interface ThirdPartyCaveat {
  encryptedCaveat: string;
  caveatKey: string;
  predicate: string;
}



export class MacaroonDischarger {

  private readonly logger = getLoggerFor(this);
  private readonly dischargeUrl:string; 

  public constructor(dischargeUrl:string){
    this.dischargeUrl = dischargeUrl;
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
        if(caveatPackets[caveatPacketIndex + 2].getValueAsText() !== this.dischargeUrl){continue;}
        // Caveat packet is a third-party caveat for this location --> add
        filteredCaveatPackets.push(caveatPacket);
      }
    }
    return filteredCaveatPackets;
  }

  private getDecryptedCaveatToDischarge(filteredCaveatPackets : CaveatPacket[], agentToDischarge:string):ThirdPartyCaveat{
    
    const macaroonKeyManager = new MacaroonKeyManager();

    for(const caveatPacket of filteredCaveatPackets){
      try{
        const pathToPodOfAgentToDischarge  = extractPathToPod(agentToDischarge);
        const decryptedCaveatId = macaroonKeyManager.decryptCaveatIdentifier(pathToPodOfAgentToDischarge, caveatPacket.getValueAsText());
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
    const {serializedMacaroon, agentToDischarge} = dischargeRequest;
    // Deserialize macaroon
    const deserializedMacaroon = MacaroonsDeSerializer.deserialize(serializedMacaroon);
    // Filter Third-Party caveatPackets that have the same caveat location as this server
    const filteredCaveatPackets = this.filterThirdPartyCaveats(deserializedMacaroon);
    // Decrypt third-party cId with corresponding private key of generated keypair
    const {caveatKey,predicate, encryptedCaveat} = this.getDecryptedCaveatToDischarge(filteredCaveatPackets,agentToDischarge);
    // Create new discharge macaroon
    return new MacaroonsBuilder(this.dischargeUrl,caveatKey,encryptedCaveat)
            .add_first_party_caveat(`agent = ${agentToDischarge}`)
            .getMacaroon().serialize();

  }
}