import * as fs from 'fs';
import NodeRSA from 'node-rsa';
import { getLoggerFor } from '@solid/community-server';
import { extractPathToPod, extractPodName } from '../util/Util';

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

  public constructor(){}


  public getPublicDischargeKey(pathToRootOfPod:string):string{
    const podName = extractPodName(pathToRootOfPod);
    const pathToPublicDischargeKey = process.cwd() + '/' + podName +  REL_DISCHARGE_KEY_FOLDER_PATH + 'public.key'
    return fs.readFileSync(pathToPublicDischargeKey).toString();
  }

  private getPrivateDischargeKey(pathToRootOfPod:string):string{
    const podName = extractPodName(pathToRootOfPod);
    const pathToPrivateDischargeKey = process.cwd() + '/' + podName +  REL_DISCHARGE_KEY_FOLDER_PATH + 'private.key'
    return fs.readFileSync(pathToPrivateDischargeKey).toString();
  }

  public encryptCaveatIdentifier(pathToRootOfPod:string, cId: string):string{
    try {
      const publicKey = this.getPublicDischargeKey(pathToRootOfPod);
      const rsa = new NodeRSA(publicKey);
      const encrypted_cId = rsa.encrypt(cId).toString();
      return encrypted_cId;
    } catch (error) {
      throw new Error("Encrypting caveat identifier failed : " + error)
    }
  };

  public decryptCaveatIdentifier(pathToRootOfPod:string, encrypted_cId:string):string{
    try {
      const privateKey = this.getPrivateDischargeKey(pathToRootOfPod);
      const rsa = new NodeRSA(privateKey);
      const decrypted_cId = rsa.decrypt(encrypted_cId).toString();
      return decrypted_cId
    } catch (error) {
      throw new Error("Decrypting caveat identifier failed : " + error)
    }
  }

  public getSecretRootKey(pathToRootOfPod:string):string{
    try {
      const podName = extractPodName(pathToRootOfPod);
      return fs.readFileSync(process.cwd() + '/' + podName + REL_MINT_KEY_FOLDER_PATH + 'secret.key').toString();  
    } catch (error) {
      this.logger.info("Error retrieving secret macaroon key : " + error)
      throw new Error("Retrieving secret root key failed : " + error);
    }
    
  }

 

}
