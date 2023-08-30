import { Macaroon, MacaroonsDeSerializer } from "macaroons.js"


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
      throw new Error('Could not extract macaroons given serialized macaroons string !');
    }
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



}