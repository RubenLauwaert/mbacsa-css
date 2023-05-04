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

}