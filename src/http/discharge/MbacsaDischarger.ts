
import { MacaroonsBuilder} from "macaroons.js";
import { getLoggerFor } from "@solid/community-server";
import { MacaroonKeyManager } from "../../mbacsa/MbacsaKeyManager";
import { WebID, extractPathToPod } from "../../util/Util";



export interface ThirdPartyCaveat {
  encryptedCaveat: string;
  caveatKey: string;
  predicate: string;
}


/**
 * The MacaroonDischarger class is responsible for generating discharge macaroons.
 * This class provides functionality to create a discharge macaroon based on a third-party
 * caveat identifier, a WebID of the entity (dischargee), and a discharge URI.
 */
export class MacaroonDischarger {

  private readonly logger = getLoggerFor(this);

  /**
   * Generates a discharge macaroon for a third-party caveat.
   * 
   * @param thirdPartyCaveatIdentifier - A unique identifier for the third-party caveat.
   * @param dischargee - The WebID of the entity for whom the discharge macaroon is being generated.
   * @param dischargeURI - The URI where the discharge macaroon will be sent for validation (this CSS).
   * @returns The serialized discharge macaroon.
   * @throws Will throw an error if the third-party caveat cannot be decrypted.
   */
  public static generateDischargeMacaroon(thirdPartyCaveatIdentifier:string, dischargee: WebID, dischargeURI:string){
    // Get path to pod of dischargee
    const pathToPodOfAgentToDischarge  = extractPathToPod(dischargee);
    // Create new key manager 
    const macaroonKeyManager = new MacaroonKeyManager(pathToPodOfAgentToDischarge);

    // Try to decrypt third-party caveat identifier
    try {
      // Try to decrypt third-party caveat id via macaroon key manager --> Private key stays in manager
      const decryptedCaveatId = macaroonKeyManager.decryptCaveatIdentifier(thirdPartyCaveatIdentifier);
      // Deconstruct decrypted caveat id
      const [caveatKey, agentPredicate, modePredicate, positionPredicate] = decryptedCaveatId.split("::");
      // Generate discharge proof
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