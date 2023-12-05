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
  private readonly delegationTokens:DelegationToken[];
  private readonly revocationStatements:RevocationStatement[]

  public constructor(macaroons:Macaroon[], revocationStatements:RevocationStatement[]){
    const [rootMacaroon,...dischargeMacaroons] = macaroons;
    this.rootMacaroon = rootMacaroon;
    this.dischargeMacaroons = dischargeMacaroons;
    this.target = this.rootMacaroon.location;   
    this.delegationTokens = dischargeMacaroons.map((dischargeMacaroon) => {
      return new DelegationToken(dischargeMacaroon);
    })
    this.revocationStatements = revocationStatements;
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
  public getHTTPMethod():string{return this.mapAccessModeToHttpMethod(this.attenuatedAccessMode)}
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
  private isCredentialRevoked():boolean{

    for(let chainIndex = 0 ; chainIndex < this.delegationTokens.length ; chainIndex++){
      const delegationToken = this.delegationTokens[chainIndex];
      for(let revocationIndex = 0; revocationIndex < this.revocationStatements.length ; revocationIndex++){
        const revocationStatement = this.revocationStatements[revocationIndex];
        if(delegationToken.getDelegatee() === revocationStatement.revokee){
          const positionDelegationToken = delegationToken.getPosition();
          const positionRevocationStatement = revocationStatement.positionRevokee;
          if(positionDelegationToken === positionRevocationStatement){
            return true;
          }
        }
      }
    }
    return false;
  }


  public isCredentialAuthorized():boolean {
    const isValid = new MacaroonsAuthorizer({path: this.target},[this.rootMacaroon,...this.dischargeMacaroons]).isValid();

    const isRevoked = this.isCredentialRevoked();

    return isValid && !isRevoked;
    
  }

  public isRevokerAuthorized(revoker: WebID, revokee: WebID):boolean{
    // Check if revoker is last in delegation chain
    const agentLastInChain = this.getAgentLastInChain();
    if(agentLastInChain != revoker){return false;}
    // Check if revokee is not present in delegation chain
    const revokeePosition = this.getAgentPositionInChain(revokee);
    if(revokeePosition){return false;}
    return true;
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

  private mapAccessModeToHttpMethod(accessMode: AccessMode): string {
    switch (accessMode) {
        case AccessMode.read:
            return "GET"; // 'read' typically corresponds to GET in HTTP
        case AccessMode.append:
            return "POST"; // 'append' might correspond to POST, as it's often used to add new data
        case AccessMode.write:
            return "PUT"; // 'write' could correspond to PUT, as it's often used for updating existing data
        case AccessMode.create:
            return "POST"; // 'create' can also be mapped to POST, commonly used to create new resources
        case AccessMode.delete:
            return "DELETE"; // 'delete' directly corresponds to the DELETE method in HTTP
        default:
            throw new Error("Invalid access mode");
    }
}



}