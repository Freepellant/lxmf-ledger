import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
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
export type ChannelId = string;
export type HtlcId = string;
export interface ChannelRecord {
    id: ChannelId;
    status: ChannelStatus;
    lockedA: bigint;
    lockedB: bigint;
    partyA: LxmfHash;
    partyB: LxmfHash;
}
export type LxmfHash = string;
export type EventLogEntry = string;
export enum ChannelStatus {
    Open = "Open",
    Closed = "Closed"
}
export enum HtlcStatus {
    Refunded = "Refunded",
    Released = "Released",
    Locked = "Locked"
}
export interface backendInterface {
    closeChannelCooperative(channelId: ChannelId, finalBalanceA: bigint, finalBalanceB: bigint, sigA: string, sigB: string): Promise<void>;
    deposit(lxmfHash: LxmfHash, amount: bigint): Promise<void>;
    getBalance(lxmfHash: LxmfHash): Promise<bigint>;
    getChannel(channelId: ChannelId): Promise<ChannelRecord | null>;
    getHTLC(htlcId: HtlcId): Promise<HtlcRecord | null>;
    getRegisteredPublicKey(lxmfHash: LxmfHash): Promise<string | null>;
    joinChannel(channelId: ChannelId, partyB: LxmfHash, amountB: bigint, signature: string): Promise<void>;
    listChannelsForAddress(lxmfHash: LxmfHash): Promise<Array<ChannelRecord>>;
    listHTLCsForAddress(lxmfHash: LxmfHash): Promise<Array<HtlcRecord>>;
    lockHTLC(senderLxmfHash: LxmfHash, receiverLxmfHash: LxmfHash, amount: bigint, paymentHash: string, expirySeconds: bigint, signature: string): Promise<HtlcId>;
    openChannel(partyA: LxmfHash, partyB: LxmfHash, amountA: bigint, signature: string): Promise<ChannelId>;
    refundHTLC(htlcId: HtlcId): Promise<void>;
    registerPublicKey(lxmfHash: LxmfHash, publicKeyHex: string): Promise<void>;
    releaseHTLC(htlcId: HtlcId, preimage: string): Promise<void>;
}
