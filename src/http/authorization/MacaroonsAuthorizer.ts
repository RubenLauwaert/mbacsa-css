import { ResourceIdentifier, getLoggerFor } from "@solid/community-server";
import { Macaroon, MacaroonsVerifier, TimestampCaveatVerifier } from "macaroons.js";
import { MacaroonKeyManager } from "../../macaroons/MacaroonKeyManager";

export class MacaroonsAuthorizer {

  private readonly logger = getLoggerFor(this);
  private readonly target:ResourceIdentifier;
  private readonly rootMacaroon:Macaroon;
  private readonly dischargeMacaroons:Macaroon[];

  public constructor(target:ResourceIdentifier, macaroons: Macaroon[]){
    this.target = target;
    // Retrieve root/discharge macaroons : Root macaroons should always be the first macaroon in the list
    const [rootMacaroon,...dischargeMacaroons] = macaroons;
    this.rootMacaroon = rootMacaroon;
    this.dischargeMacaroons = dischargeMacaroons;


  }


  public TimeStampVerifier(caveat:string):boolean{
    if(!caveat.includes("time < ")){return false;}
    const expiryTime = parseInt(caveat.replace("time < ",""));
    if(expiryTime  > Date.now()){
      this.logger.info("Verified timestamp !");
      return true;}
    return false;
  }




  public isAuthorized():boolean{
    // Check if target matches location of root macaroon
    if(this.target.path !== this.rootMacaroon.location){return false};
    
    const macaroonVerifier = new MacaroonsVerifier(this.rootMacaroon);
    // Timestamp verifier
    
    macaroonVerifier.satisfyGeneral((caveat) => {
      if(!caveat.includes("time < ")){return false;}
      const expiryTime = parseInt(caveat.replace("time < ",""));
      if(expiryTime  > Date.now()){
        this.logger.info("Verified timestamp !");
        return true;}
      return false;
    });
    
    // Third-Party caveats verifier
    this.dischargeMacaroons.forEach((dischargeMacaroon) =>{
      macaroonVerifier.satisfyGeneral((caveat) => {
        if(!caveat.includes("agent = ")){return false;}
        else{return true;}
      });
      macaroonVerifier.satisfy3rdParty(dischargeMacaroon);
    })
    

    // Perform validation of macaroon
    const rootSecretKey = new MacaroonKeyManager().getSecretRootKey();
    const isVerified = macaroonVerifier.isValid(rootSecretKey);
    return isVerified;
  
  }




}