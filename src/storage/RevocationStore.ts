import { EqualReadWriteLocker, FileSystemResourceLocker, KeyValueStorage, VoidLocker, WrappedExpiringReadWriteLocker, getLoggerFor, isSystemError } from "@solid/community-server";
import { WebID, extractPathToPod, extractPodName } from "../util/Util";
import {writeJson, readJson} from 'fs-extra'
import { RevocationStatement } from "../types/RevocationStatement";

const REVOCATION_FILE_PATH = '/revocation/revocation-store'

/**
 * Manages the storage and retrieval of revocation statements for macaroons in a JSON file.
 */
export class RevocationStore implements KeyValueStorage<string,RevocationStatement[]> {

  private readonly logger = getLoggerFor(this);
  private readonly filePath;
  private readonly locker;
  private readonly lockIdentifier;


  /**
   * Constructs a RevocationStore.
   * @param storeOwner The WebID of the store owner.
   */
  public constructor(storeOwner: WebID){
    const pathToPodOfStoreOwner = extractPathToPod(storeOwner);
    this.filePath = extractPodName(pathToPodOfStoreOwner) + REVOCATION_FILE_PATH;
    this.locker = new VoidLocker()
    this.lockIdentifier = { path: this.filePath };
  }

  /**
   * Retrieves the revocation statements associated with the given macaroon identifier.
   * @param key The macaroon identifier for which to retrieve revocation statements.
   * @returns A promise resolving to an array of RevocationStatements.
   */
  public async get(key: string): Promise<RevocationStatement[]> {
    let revocationStatements:RevocationStatement[] = [];
    const json = await this.getJsonSafely();
    if(json[key]){
      revocationStatements = json[key] as RevocationStatement[];
    }
    return revocationStatements;
  }

  /**
   * Checks whether the store contains revocation statements for the specified macaroon identifier.
   * @param key The macaroon identifier to check in the store.
   * @returns A promise resolving to a boolean indicating existence.
   */
  public async has(key: string): Promise<boolean> {
    const json = await this.getJsonSafely();
    return typeof json[key] !== 'undefined';
  }

  /**
   * Sets the revocation statements for the specified macaroon identifier.
   * @param key The macaroon identifier for which to set revocation statements.
   * @param value The revocation statements to set.
   * @returns The instance of the RevocationStore.
   */
  public async set(key: string, value: RevocationStatement[]): Promise<this> {
    return this.updateJsonSafely((json: NodeJS.Dict<unknown>): this => {
      json[key] = value;
      return this;
    });
  }

  /**
   * Inserts a single revocation statement for the specified macaroon identifier.
   * @param key The macaroon identifier for which to insert a revocation statement.
   * @param revocationStatement The revocation statement to insert.
   * @returns The instance of the RevocationStore.
   */
  public async insertRevocationStatement(key: string, revocationStatement: RevocationStatement):Promise<this>{
    return this.updateJsonSafely((json: NodeJS.Dict<unknown>): this => {
      const oldStatements = json[key] as RevocationStatement[];
      if(oldStatements){
        json[key] = oldStatements.push(revocationStatement);
      }
      else{
        json[key] = [revocationStatement];
      }
      
      return this;
    })
  }

  /**
   * Deletes the revocation statements associated with the specified macaroon identifier.
   * @param key The macaroon identifier for which to delete revocation statements.
   * @returns A promise resolving to a boolean indicating success or failure.
   */
  public async delete(key: string): Promise<boolean> {
    return this.updateJsonSafely((json: NodeJS.Dict<unknown>): boolean => {
      if (typeof json[key] !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete json[key];
        return true;
      }
      return false;
    });
  }

   /**
   * Provides an async iterator over all entries in the revocation store.
   * @returns An async iterable iterator of key-value pairs.
   */
  public async* entries(): AsyncIterableIterator<[ string, RevocationStatement[] ]> {
    const json = await this.getJsonSafely();
    const entries = Object.entries(json);
    return entries;
  }

  /**
   * Acquires the data in the JSON file while using a read lock.
   */
  private async getJsonSafely(): Promise<NodeJS.Dict<unknown>> {
    return this.locker.withReadLock(this.lockIdentifier, this.getJson.bind(this));
  }

  /**
   * Updates the data in the JSON file while using a write lock.
   * @param updateFn - A function that updates the JSON object.
   *
   * @returns The return value of `updateFn`.
   */
  private async updateJsonSafely<T>(updateFn: (json: NodeJS.Dict<unknown>) => T): Promise<T> {
    return this.locker.withWriteLock(this.lockIdentifier, async(): Promise<T> => {
      const json = await this.getJson();
      const result = updateFn(json);
      await writeJson(this.filePath, json, { encoding: 'utf8', spaces: 2 });
      return result;
    });
  }

  /**
   * Reads and parses the data from the JSON file (without locking).
   */
  private async getJson(): Promise<NodeJS.Dict<unknown>> {
    try {
      return await readJson(this.filePath, 'utf8');
    } catch (error: unknown) {
      if (isSystemError(error) && error.code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }


}