import { CaveatPacket, Macaroon } from "macaroons.js";
import { WebID, extractWebID } from "../util/Util";
import { DelegationToken } from "./DelegationToken";
import { RevocationStatement } from "../types/RevocationStatement";
import { AccessMode } from "@solid/community-server";
import { MacaroonsAuthorizer } from "../http/authorization/MacaroonsAuthorizer";

export class MbacsaCredential {

  private readonly target:string
  private readonly chainLength:number;
  private readonly rootMacaroon:Macaroon;
  private readonly dischargeMacaroons:Macaroon[];
  private readonly attenuatedAccessMode:AccessMode;
  private readonly delegationTokens:DelegationToken[]

  public constructor(macaroons:Macaroon[]){
    const [rootMacaroon,...dischargeMacaroons] = macaroons;
    this.rootMacaroon = rootMacaroon;
    this.dischargeMacaroons = dischargeMacaroons;
    this.target = this.rootMacaroon.location;   
    this.delegationTokens = dischargeMacaroons.map((dischargeMacaroon) => {
      return new DelegationToken(dischargeMacaroon);
    })
    // Extract most restrictive access mode out of root macaroon and delegation tokens
    this.attenuatedAccessMode = this.extractAttenuatedAccessMode(this.rootMacaroon.caveatPackets,this.delegationTokens)
    this.chainLength = dischargeMacaroons.length;

  }

  // Getters
  public getIdentifier():string{return this.rootMacaroon.identifier}
  public getTarget():string{return this.target};
  public getIssuer():WebID{return extractWebID(this.target)};
  public getChainLength():number{return this.chainLength;};
  public getAttenuatedAccessMode():AccessMode{return this.attenuatedAccessMode}
  public getAgentLastInChain():WebID{return this.delegationTokens[this.delegationTokens.length - 1].getDelegatee();}
  public getAgentPositionInChain(agent: WebID):number|undefined{
    let position;
    for(let chainIndex = 0 ; chainIndex < this.delegationTokens.length ; chainIndex ++){
      const delegationToken = this.delegationTokens[chainIndex];
      if(delegationToken.getDelegatee() === agent){
        position = delegationToken.getPosition();
      }
    }
    return position;
  }

  // Checkers
  public isCredentialRevoked(revocationStatements: RevocationStatement[]):boolean{

    for(let chainIndex = 0 ; chainIndex < this.delegationTokens.length ; chainIndex++){
      const delegationToken = this.delegationTokens[chainIndex];
      for(let revocationIndex = 0; revocationIndex < revocationStatements.length ; revocationIndex++){
        const revocationStatement = revocationStatements[revocationIndex];
        if(delegationToken.getDelegatee() === revocationStatement.revokee){return true;}
      }
    }
    return false;
  }


  public isCredentialAuthorized():boolean {
    const isValid = new MacaroonsAuthorizer({path: this.target},[this.rootMacaroon,...this.dischargeMacaroons]).isValid();
    return isValid;
  }

  // Helpers

  private extractAttenuatedAccessMode(rootCaveats: CaveatPacket[], delegationTokens: DelegationToken[]):AccessMode{
    // Get access mode contained in minted root macaroon
    const rootCaveatsText = rootCaveats.map((caveat) => {return caveat.getValueAsText()});
    if(rootCaveatsText.length < 2 || !rootCaveatsText[1].includes("mode = "))
      {throw new Error("Invalid root macaroon: does not contain a mode as second caveat !")}
    const rootModeText = rootCaveatsText[1].slice("mode = ".length);
    const rootModeType = rootModeText as keyof typeof AccessMode;
    const rootMode = AccessMode[rootModeType];
    // Check if there is an attenuated mode in the chain of delegation tokens
    const attenuatedModes = delegationTokens.map((delegationToken) => {return delegationToken.getAttenuatedMode()})
                              .filter((potentialAccessMode) => {return potentialAccessMode !== undefined})
    if(attenuatedModes.length > 0){return attenuatedModes[attenuatedModes.length - 1] as AccessMode}
    else{return rootMode;}
  }



}