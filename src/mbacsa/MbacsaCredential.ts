import { Macaroon } from "macaroons.js";
import { WebID, extractWebID } from "../util/Util";
import { DelegationToken } from "./DelegationToken";
import { RevocationStatement } from "../types/RevocationStatement";

export class MbacsaCredential {

  private readonly target:string
  private readonly chainLength:number;
  private readonly rootMacaroon:Macaroon;
  private readonly delegationTokens:DelegationToken[]

  public constructor(macaroons:Macaroon[]){
    const [rootMacaroon,...dischargeMacaroons] = macaroons;
    this.rootMacaroon = rootMacaroon;
    this.target = this.rootMacaroon.location;
    this.delegationTokens = dischargeMacaroons.map((dischargeMacaroon) => {
      return new DelegationToken(dischargeMacaroon);
    })
    this.chainLength = dischargeMacaroons.length;

  }

  // Getters
  public getIdentifier():string{return this.rootMacaroon.identifier}
  public getTarget():string{return this.target};
  public getIssuer():WebID{return extractWebID(this.target)};
  public getChainLength():number{return this.chainLength;}
  public getAgentLastInChain():WebID{
    return this.delegationTokens[this.delegationTokens.length - 1].getDelegatee();
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



}