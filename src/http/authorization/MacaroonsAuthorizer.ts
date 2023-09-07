import { ResourceIdentifier, getLoggerFor } from "@solid/community-server";
import { Macaroon, MacaroonsVerifier, TimestampCaveatVerifier } from "macaroons.js";
import { MacaroonKeyManager } from "../../macaroons/MacaroonKeyManager";
import { extractPathToPod, extractWebID } from "../../util/Util";

export class MacaroonsAuthorizer {

  private readonly logger = getLoggerFor(this);
  private readonly target:ResourceIdentifier;
  private readonly issuer:string
  private readonly rootMacaroon:Macaroon;
  private readonly dischargeMacaroons:Macaroon[];

  public constructor(target:ResourceIdentifier, macaroons: Macaroon[]){
    this.target = target;
    this.issuer = extractWebID(target.path);
    // Retrieve root/discharge macaroons : Root macaroons should always be the first macaroon in the list
    const [rootMacaroon,...dischargeMacaroons] = macaroons;
    this.rootMacaroon = rootMacaroon;
    this.logger.info(rootMacaroon.inspect())
    this.dischargeMacaroons = dischargeMacaroons;


  }

  // Verify if macaroon is valid within time-interval
  public TimeStampVerifier(caveat:string):boolean {
    if(!caveat.includes("time < ")){return false;}
    const expiryTime = parseInt(caveat.replace("time < ",""));
    if(expiryTime  > Date.now()){
      this.logger.info("Verified timestamp !");
      return true;}
    return false;
  }

  // Verify issuer of macaroon 
  public IssuerVerifier(caveat:string):boolean {
    if(!caveat.includes(`issuer = ${this.issuer}`)){return false;}
    return true;
  }



  public isAuthorized():boolean{
    // Check if target matches location of root macaroon
    if(this.target.path !== this.rootMacaroon.location){return false};
    
    
    const macaroonVerifier = new MacaroonsVerifier(this.rootMacaroon);
    
    // Verify issuer
    macaroonVerifier.satisfyExact(`issuer = ${this.issuer}`);
    
    // Verify timestamp
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
    const rootOfIssuer =  extractPathToPod(this.target.path);
    const rootSecretKey = new MacaroonKeyManager(rootOfIssuer).getSecretRootKey();
    const isVerified = macaroonVerifier.isValid(rootSecretKey);
    return isVerified;
  
  }




}