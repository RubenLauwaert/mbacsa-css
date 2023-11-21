import { DischargeRequest } from "../../types/Requests";
import {CaveatPacket, CaveatPacketType, Macaroon, MacaroonsBuilder, MacaroonsDeSerializer } from "macaroons.js";
import { AccessMode, getLoggerFor } from "@solid/community-server";
import { MacaroonKeyManager } from "../../mbacsa/MbacsaKeyManager";
import { WebID, extractPathToPod } from "../../util/Util";
import { MacaroonsExtractor } from "../../mbacsa/MacaroonsExtractor";


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
    
    const pathToPodOfAgentToDischarge  = extractPathToPod(agentToDischarge);
    const macaroonKeyManager = new MacaroonKeyManager(pathToPodOfAgentToDischarge);

    for(const caveatPacket of filteredCaveatPackets){
      try{
        const decryptedCaveatId = macaroonKeyManager.decryptCaveatIdentifier(caveatPacket.getValueAsText());
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
    const {serializedRootMacaroon, agentToDischarge, mode} = dischargeRequest;
    // Deserialize macaroon
    const rootMacaroon = MacaroonsDeSerializer.deserialize(serializedRootMacaroon as string);
    // Filter Third-Party caveatPackets that have the same caveat location as this server
    const filteredCaveatPackets = this.filterThirdPartyCaveats(rootMacaroon);
    // Decrypt third-party cId with corresponding private key of generated keypair
    const {caveatKey,predicate, encryptedCaveat} = this.getDecryptedCaveatToDischarge(filteredCaveatPackets,agentToDischarge);
    // Get position in chain of delegations
    const delegationPosition = MacaroonsExtractor.retrieveDelegationPosition(rootMacaroon,encryptedCaveat);
    // Get mode out of root macaroon and check if the delegated mode is an attenuation of the mode of the root macaroon
    if(mode){
      const requestedMode = AccessMode[mode as keyof typeof AccessMode];
      const rootAccessMode = MacaroonsExtractor.extractModeFromMacaroon(rootMacaroon);
      if(requestedMode <= rootAccessMode){
        // Create new discharge macaroon with attenuated mode
      return new MacaroonsBuilder(this.dischargeUrl,caveatKey,encryptedCaveat)
      .add_first_party_caveat(`agent = ${agentToDischarge}`)
      .add_first_party_caveat(`position = ${delegationPosition}`)
      .add_first_party_caveat(`mode = ${mode}`)
      .getMacaroon().serialize();
      }else{
        throw new Error("Unauthorized to discharge : Requested delegated access mode is not an attenuated mode of the root macaroon")
      }
    }else{
      // Create new discharge macaroon without mode 
      return new MacaroonsBuilder(this.dischargeUrl,caveatKey,encryptedCaveat)
      .add_first_party_caveat(`agent = ${agentToDischarge}`)
      .add_first_party_caveat(`position = ${delegationPosition}`)
      .getMacaroon().serialize();
    }


  }

  public static generateDischargeMacaroon(thirdPartyCaveatIdentifier:string, dischargee: WebID, dischargeURI:string){

    const pathToPodOfAgentToDischarge  = extractPathToPod(dischargee);
    const macaroonKeyManager = new MacaroonKeyManager(pathToPodOfAgentToDischarge);

    // Try to decrypt third-party caveat identifier
    try {
      const decryptedCaveatId = macaroonKeyManager.decryptCaveatIdentifier(thirdPartyCaveatIdentifier);
      const [caveatKey, agentPredicate, modePredicate, positionPredicate] = decryptedCaveatId.split("::");
      return new MacaroonsBuilder(dischargeURI,caveatKey,thirdPartyCaveatIdentifier)
        .add_first_party_caveat(agentPredicate)
        .add_first_party_caveat(positionPredicate)
        .add_first_party_caveat(modePredicate)
        .getMacaroon().serialize()
    } catch (error) {
      throw new Error("Could not decrypt third-party caveat !");
    }
  }

}