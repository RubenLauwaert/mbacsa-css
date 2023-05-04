export interface MintRequest {
  resourceURI: string,
  requestor: string,
  dischargeKey: {
    kty: string;
    e: string;
    n: string;
    use?: string;
    kid?: string;
    alg?: string;
  };
}