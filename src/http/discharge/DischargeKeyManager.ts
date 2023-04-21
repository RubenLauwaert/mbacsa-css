import * as fs from 'fs';
import NodeRSA from 'node-rsa';
import { getLoggerFor } from '@solid/community-server';

const BASE_PATH = "../../../config/keys/";
const FILE_NAME_PRIVATE_KEY = "private.key";
const FILE_NAME_PUBLIC_KEY = "public.key";


export class DischargeKeyManager {

  private readonly logger = getLoggerFor(this);

  public static getPublicKey():Buffer{
    return fs.readFileSync(BASE_PATH + FILE_NAME_PUBLIC_KEY);
  }

  public static getPrivateKey():Buffer{ 
    return fs.readFileSync(process.cwd() + "/config/keys/private.key"); 
  }

  public static decrypt(encryptedData:string):string {
    try {
      const key = new NodeRSA(this.getPrivateKey().toString());
      const decryptedData = key.decrypt(encryptedData).toString();
      return decryptedData;  
    } catch (error) {
      throw new Error("There was an error in decrypting the encrypted caveatID !");
    }
  }

}