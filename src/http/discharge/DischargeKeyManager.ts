import * as fs from 'fs';


const BASE_PATH = "../../../config/keys/";
const FILE_NAME_PRIVATE_KEY = "private.key";
const FILE_NAME_PUBLIC_KEY = "public.key";


export class DischargeKeyManager {

  public static getPublicKey():Buffer{
    return fs.readFileSync(BASE_PATH + FILE_NAME_PUBLIC_KEY);
  }

  public static getPrivateKey():Buffer{ 
    return fs.readFileSync(process.cwd() + "/config/keys/private.key"); 
  }

}