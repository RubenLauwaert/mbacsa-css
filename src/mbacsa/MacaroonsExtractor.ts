import { Macaroon, MacaroonsDeSerializer } from "macaroons.js"
import { WebID } from "../util/Util";
import { AccessMode } from "@solid/community-server";


export class MacaroonsExtractor {


  public static extractMacaroons(serializedMacaroonsString:string):Macaroon[]{
  
    try {
      const serializedMacaroons = serializedMacaroonsString.split(',');
      const macaroons:Macaroon[] = [];
      serializedMacaroons.forEach((serializedMacaroon) => {
        const macaroon = MacaroonsDeSerializer.deserialize(serializedMacaroon);
        macaroons.push(macaroon);
      });
      return macaroons; 
    } catch (error) {
      throw new Error('Could not extract macaroons given serialized macaroons !');
    }
  }


  public static extractModeFromMacaroon(macaroon:Macaroon):AccessMode {
    const caveats = macaroon.caveatPackets;
    let mode = AccessMode.read;
    for(let i = 0 ; i < caveats.length ; i++){
      const caveat = caveats[i];
      const caveatMessage = caveat.getValueAsText();
      if(caveatMessage.includes("mode = ")){
        const modeStr = caveatMessage.split('=')[1].trim();
        mode = AccessMode[modeStr as keyof typeof AccessMode];
        break;
      }
    }
    return mode;
  }



  public static extractDelegatedAgentFromMacaroon(macaroon:Macaroon):string {
    const caveats = macaroon.caveatPackets;
    let delegatedAgent = ""
    for (let i = 0; i < caveats.length; i++) {
      const caveat = caveats[i];
      const caveatMessage = caveat.getValueAsText();
    
      if (caveatMessage.includes('agent = ')) {
        delegatedAgent = caveatMessage.split('=')[1].trim();
        break; // Exit the loop when the condition is met
      }
    }
    return delegatedAgent;
  }

  public static retrieveDelegationPosition(rootMacaroon:Macaroon, cId:string):number {
    let position = 0;
    const { caveatPackets } = rootMacaroon;
    const thirdPartyCaveatPackets = caveatPackets.filter((caveatPacket,index,caveatPackets) => {
      return (caveatPacket.type === 3) && (caveatPackets[index + 1].type === 4) && (caveatPackets[index + 2].type === 5);
    })
    for(let i = 0 ; i < thirdPartyCaveatPackets.length ; i++){
      const tpCaveat = thirdPartyCaveatPackets[i];
      if(tpCaveat.getValueAsText() === cId){
        position = i + 1;
      }
    }
    return position;
  }

  public static retrieveDelegationPositionForAgent(dischargeMacaroons:Macaroon[], agent: WebID):number{
    let delegationPosition = 0;
    for(let i = 0 ; i < dischargeMacaroons.length ; i++){
      const dischargeMacaroon = dischargeMacaroons[i];
      const dischargeMacaroonText = dischargeMacaroon.inspect();
      if(dischargeMacaroonText.includes(`agent = ${agent}`)){
        const caveatPackets = dischargeMacaroon.caveatPackets;
        for(let caveatIndex = 0 ; caveatIndex < caveatPackets.length ; caveatIndex++){
          const caveatText = caveatPackets[caveatIndex].getValueAsText();
          if(caveatText.includes("position = ")){
            delegationPosition = parseInt(caveatText.slice("position = ".length));
          }
        }
      }
    }
    return delegationPosition;
  }
  

}