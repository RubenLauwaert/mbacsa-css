import * as fs from 'fs';
import NodeRSA from 'node-rsa';
import { getLoggerFor } from '@solid/community-server';

export interface MacaroonKeyManagerI {
  // Discharge
  getPublicDischargeKey: () => string,
  encryptCaveatIdentifier: (cId: string) => string,
  decryptCaveatIdentifier: (encrypted_cId:string) => string,
  // Minting & Verification
  getSecretRootKey: () => string

}


const REL_DISCHARGE_KEY_FOLDER_PATH = '/config/keys/macaroon/discharge/';
const REL_ROOT_KEY_FOLDER_PATH = '/config/keys/macaroon/root/';


export class MacaroonKeyManager implements MacaroonKeyManagerI {
  
  
  public constructor(){}


  public getPublicDischargeKey():string{
    return fs.readFileSync(process.cwd() + REL_DISCHARGE_KEY_FOLDER_PATH + 'public.key').toString();
  }

  private getPrivateDischargeKey():string{
    return fs.readFileSync(process.cwd() + REL_DISCHARGE_KEY_FOLDER_PATH + 'private.key').toString();
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
      const rsa = new NodeRSA(privateKey);
      const decrypted_cId = rsa.decrypt(encrypted_cId).toString();
      return decrypted_cId
    } catch (error) {
      throw new Error("Decrypting caveat identifier failed : " + error)
    }
  }

  public getSecretRootKey():string{
    try {
      return fs.readFileSync(process.cwd() + REL_ROOT_KEY_FOLDER_PATH + 'root.txt').toString();  
    } catch (error) {
      throw new Error("Retrieving secret root key failed : " + error);
    }
    
  }

 

}
