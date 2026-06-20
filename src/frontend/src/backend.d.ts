import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type LxmfHash = string;
export type Timestamp = bigint;
export interface HtlcRecord {
    id: HtlcId;
    status: HtlcStatus;
    senderLxmfHash: LxmfHash;
    receiverLxmfHash: LxmfHash;
    paymentHash: string;
    expiry: Timestamp;
    amount: bigint;
}
export type EventLogEntry = string;
export type HtlcId = string;
export enum HtlcStatus {
    Refunded = "Refunded",
    Released = "Released",
    Locked = "Locked"
}
export interface backendInterface {
    deposit(lxmfHash: LxmfHash, amount: bigint): Promise<void>;
    getBalance(lxmfHash: LxmfHash): Promise<bigint>;
    getHTLC(htlcId: HtlcId): Promise<HtlcRecord | null>;
    listHTLCsForAddress(lxmfHash: LxmfHash): Promise<Array<HtlcRecord>>;
    lockHTLC(senderLxmfHash: LxmfHash, receiverLxmfHash: LxmfHash, amount: bigint, paymentHash: string, expirySeconds: bigint): Promise<HtlcId>;
    refundHTLC(htlcId: HtlcId): Promise<void>;
    releaseHTLC(htlcId: HtlcId, preimage: string): Promise<void>;
}
