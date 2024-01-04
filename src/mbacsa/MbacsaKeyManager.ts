import * as fs from 'fs';
import NodeRSA from 'node-rsa';
import { getLoggerFor } from '@solid/community-server';
import { extractPodName } from '../util/Util';

const REL_DISCHARGE_KEY_FOLDER_PATH = '/keys/discharge/';
const REL_MINT_KEY_FOLDER_PATH = '/keys/mint/';

export interface MacaroonKeyManagerI {
  // Discharge
  getPublicDischargeKey: (pathToRootOfPod:string) => string,
  encryptCaveatIdentifier: (pathToRootOfPod:string, cId: string) => string,
  decryptCaveatIdentifier: (pathToRootOfPod:string, encrypted_cId:string) => string,
  // Minting & Verification
  getSecretRootKey: (pathToRootOfPod:string) => string

}


export class MacaroonKeyManager implements MacaroonKeyManagerI {
  
  private readonly logger = getLoggerFor(this);
  private readonly pathToRootOfPod:string;

  public constructor(pathToRootOfPod:string){
    this.pathToRootOfPod = pathToRootOfPod;
  }


  public getPublicDischargeKey():string{
    const podName = extractPodName(this.pathToRootOfPod);
    const pathToPublicDischargeKey = process.cwd() + '/' + podName +  REL_DISCHARGE_KEY_FOLDER_PATH + 'public.key'
    return fs.readFileSync(pathToPublicDischargeKey).toString();
  }

  private getPrivateDischargeKey():string{
    const podName = extractPodName(this.pathToRootOfPod);
    const pathToPrivateDischargeKey = process.cwd() + '/' + podName +  REL_DISCHARGE_KEY_FOLDER_PATH + 'private.key'
    return fs.readFileSync(pathToPrivateDischargeKey).toString();
  }

  public encryptCaveatIdentifier(cId: string):string{
    try {
      const publicKey = this.getPublicDischargeKey();
      const rsa = new NodeRSA(publicKey);
      const encrypted_cId = rsa.encrypt(cId).toString();
      return encrypted_cId;
    } catch (error) {
      throw new Error("Encrypting caveat identifier failed : " + error)
    }
  };

  public decryptCaveatIdentifier(encrypted_cId:string):string{
    try {
      const privateKey = this.getPrivateDischargeKey();
      const rsa = new NodeRSA();
      const key = rsa.importKey(privateKey,'private');
      const decrypted_cId = key.decrypt(encrypted_cId,'utf8').toString();
      return decrypted_cId
    } catch (error) {
      throw new Error("Decrypting caveat identifier failed : " + error)
    }
  }

  public getSecretRootKey():string{
    try {
      const podName = extractPodName(this.pathToRootOfPod);
      return fs.readFileSync(process.cwd() + '/' + podName + REL_MINT_KEY_FOLDER_PATH + 'secret.key').toString();  
    } catch (error) {
      this.logger.info("Error retrieving secret macaroon key : " + error)
      throw new Error("Retrieving secret root key failed : " + error);
    }
    
  }

 

}
