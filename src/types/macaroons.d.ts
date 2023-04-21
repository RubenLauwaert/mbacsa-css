declare module 'macaroons.js' {

  declare type Macaroon = {
    location: string;
    identifier: string;
    signature: string;
    signatureBuffer: Buffer;
    caveatPackets: CaveatPacket[];
    constructor(location: string, identifier: string, signature: Buffer, caveats?: CaveatPacket[]);
    serialize(): string;
    inspect(): string;
}

  declare class MacaroonsBuilder {
    "use strict": any;
    constructor(location:string, secretKey:string, identifier:string);
    modify(macaroon: Macaroon): MacaroonsBuilder;
    getMacaroon(): Macaroon;
    create(location: string, secretKey: string, identifier: string): Macaroon;
    create(location: string, secretKey: Buffer, identifier: string): Macaroon;
    deserialize(serializedMacaroon: string): Macaroon;
    add_first_party_caveat(caveat: string): MacaroonsBuilder;
    add_third_party_caveat(location: string, secret: string, identifier: string): MacaroonsBuilder;
    prepare_for_request(macaroon: Macaroon): MacaroonsBuilder;
  }

  declare class MacaroonsVerifier {
    //"use strict": any;
    constructor(macaroon: Macaroon);
    assertIsValid(secret: string): void;
    assertIsValid(secret: Buffer): void;
    isValid(secret: string): boolean;
    isValid(secret: Buffer): boolean;
    satisfyExact(caveat: string): MacaroonsVerifier;
    satisfy3rdParty(preparedMacaroon: Macaroon): MacaroonsVerifier;
    satisfyGeneral(generalVerifier: (caveat: string) => boolean): MacaroonsVerifier;
  }


  declare class MacaroonsDeSerializer {
    static deserialize(serializedMacaroon: string): Macaroon;
    private static deserializeStream;
    private static parseSignature;
    private static parsePacket;
    private static parseRawPacket;
    private static bytesStartWith;
    private static readPacket;
}

declare class MacaroonsSerializer {
  "use strict": any;
  private static HEX;
  static serialize(macaroon: Macaroon): string;
  private static serialize_packet;
  private static serialize_packet_buf;
  private static packet_header;
  private static flattenByteArray;
}

  declare class MacaroonsConstants {
    static MACAROON_MAX_STRLEN: number;
    static MACAROON_MAX_CAVEATS: number;
    static MACAROON_SUGGESTED_SECRET_LENGTH: number;
    static MACAROON_HASH_BYTES: number;
    static PACKET_PREFIX_LENGTH: number;
    static PACKET_MAX_SIZE: number;
    static MACAROON_SECRET_KEY_BYTES: number;
    static MACAROON_SECRET_NONCE_BYTES: number;
    static MACAROON_SECRET_TEXT_ZERO_BYTES: number;
    static MACAROON_SECRET_BOX_ZERO_BYTES: number;
    static SECRET_BOX_OVERHEAD: number;
    static VID_NONCE_KEY_SZ: number;
    static LOCATION: string;
    static LOCATION_BYTES: Buffer;
    static IDENTIFIER: string;
    static IDENTIFIER_BYTES: Buffer;
    static SIGNATURE: string;
    static SIGNATURE_BYTES: Buffer;
    static CID: string;
    static CID_BYTES: Buffer;
    static VID: string;
    static VID_BYTES: Buffer;
    static CL: string;
    static CL_BYTES: Buffer;
    static LINE_SEPARATOR_STR: string;
    static LINE_SEPARATOR: number;
    static LINE_SEPARATOR_LEN: number;
    static KEY_VALUE_SEPARATOR_STR: string;
    static KEY_VALUE_SEPARATOR: number;
    static KEY_VALUE_SEPARATOR_LEN: number;
    static IDENTIFIER_CHARSET: BufferEncoding;
}

declare enum CaveatPacketType {
    location = 0,
    identifier = 1,
    signature = 2,
    cid = 3,
    vid = 4,
    cl = 5
}


declare class CaveatPacket {
  type: CaveatPacketType;
  rawValue: Buffer;
  private valueAsText;
  constructor(type: CaveatPacketType, valueAsText: string);
  constructor(type: CaveatPacketType, valueAsBuffer: Buffer);
  getRawValue(): Buffer;
  getValueAsText(): string;
}


}