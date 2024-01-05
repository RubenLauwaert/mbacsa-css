import { ResourceIdentifier, getLoggerFor, AccessMode } from "@solid/community-server";
import { Macaroon, MacaroonsVerifier, TimestampCaveatVerifier } from "macaroons.js";
import { MacaroonKeyManager } from "../../mbacsa/MbacsaKeyManager";
import { extractPathToPod, extractWebID } from "../../util/Util";


/**
 * MacaroonsAuthorizer is responsible for authorizing access to resources
 * based on macaroons. It verifies the validity of both root and discharge macaroons
 * against a set of predefined conditions.
 */
export class MacaroonsAuthorizer {

  private readonly logger = getLoggerFor(this);
  private readonly target:ResourceIdentifier;
  private readonly issuer:string
  private readonly rootMacaroon:Macaroon;
  private readonly dischargeMacaroons:Macaroon[];


  /**
   * Constructs a new instance of MacaroonsAuthorizer.
   * 
   * @param target - The resource identifier for which authorization is being checked.
   * @param macaroons - An array of macaroons, where the first one is expected to be the root macaroon,
   *                    followed by any discharge macaroons.
   */
  public constructor(target:ResourceIdentifier, macaroons: Macaroon[]){
    this.target = target;
    this.issuer = extractWebID(target.path);
    // Retrieve root/discharge macaroons : Root macaroons should always be the first macaroon in the list
    const [rootMacaroon,...dischargeMacaroons] = macaroons;
    this.rootMacaroon = rootMacaroon;
    this.dischargeMacaroons = dischargeMacaroons;

  }
  /**
  * Validates the macaroons against the target resource, issuer, expiry time, access mode,
  * and discharge conditions.
  * 
  * @returns true if the macaroons are valid for the target resource, false otherwise.
  */
  public isValid():boolean{
    // Check if target matches location of root macaroon
    if(this.target.path !== this.rootMacaroon.location){return false};
    
    // Create new instance of MacaroonsVerifier
    const macaroonVerifier = new MacaroonsVerifier(this.rootMacaroon);
    
    // Verify issuer
    macaroonVerifier.satisfyGeneral((caveat) => {
      if(!caveat.includes(`issuer = ${this.issuer}`)){return false;}
      return true;
    });

    // Verify time 
    macaroonVerifier.satisfyGeneral((caveat) => {
      if(!caveat.includes("time < ")){return false;}
      const expiryTime = parseInt(caveat.replace("time < ",""));
      if(expiryTime  > Date.now()){
        return true;}
      return false;
    });
    
    // Verify mode
    macaroonVerifier.satisfyGeneral((caveat) => {
      if(!caveat.includes(`mode = `)){return false;}
      const mode = caveat.replace("mode = ","");
      if(!Object.values(AccessMode).includes(mode as AccessMode)){return false;}
      return true;
    });
    
    // Third-Party caveats verifier
    this.dischargeMacaroons.forEach((dischargeMacaroon,index) =>{

      macaroonVerifier.satisfy3rdParty(dischargeMacaroon);

      const delegationPosition = index + 1;
      // Check if every discharge macaroon has discharged agent caveat
      macaroonVerifier.satisfyGeneral((caveat) => {
        if(!caveat.includes("agent = ")){return false;}
        else{return true;}
      });
      // Check if discharge macaroons have sequential positions
      macaroonVerifier.satisfyGeneral((caveat) => {
        if(!caveat.includes(`position = ${delegationPosition}`)){return false;}
        else{return true;}
      })

    })
    
    // Perform validation of macaroon
    const rootOfIssuer =  extractPathToPod(this.target.path);
    const rootSecretKey = new MacaroonKeyManager(rootOfIssuer).getSecretRootKey();
    const isValid = macaroonVerifier.isValid(rootSecretKey);
    return isValid; 
  }
}