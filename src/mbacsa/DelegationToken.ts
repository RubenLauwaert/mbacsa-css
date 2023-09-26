import { AccessMode } from "@solid/community-server";
import { Macaroon } from "macaroons.js";
import { WebID } from "../util/Util";

export class DelegationToken {

  private readonly delegatee:WebID;
  private readonly position:number;
  private readonly attenuatedMode?:AccessMode;

  public constructor(dischargeMacaroon:Macaroon){
    const caveats = dischargeMacaroon.caveatPackets.map((caveatPacket) => {
      return caveatPacket.getValueAsText()
    })
    if(caveats.length < 2){throw new Error("Discharge macaroon has less than two caveats !")}
    this.delegatee = caveats[0].slice("agent = ".length);
    this.position = parseInt(caveats[1].slice("position = ".length));
    if(caveats.length === 3){
      const attenuatedModeStr = caveats[2].slice("mode = ".length);
      const typedMode = attenuatedModeStr as keyof typeof AccessMode
      this.attenuatedMode = AccessMode[typedMode];
    
    }
  }

  // Getters

  public getDelegatee():WebID{return this.delegatee;}
  public getPosition():number{return this.position;}
  public getAttenuatedMode():AccessMode|undefined{return this.attenuatedMode;}


}