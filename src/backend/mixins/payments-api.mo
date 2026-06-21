import Map "mo:core/Map";
import List "mo:core/List";
import Common "../types/common";
import Types "../types/payments";
import PaymentsLib "../lib/payments";

mixin (
  balances : Map.Map<Common.LxmfHash, Nat>,
  htlcs : Map.Map<Common.HtlcId, Types.HtlcRecord>,
  eventLog : List.List<Types.EventLogEntry>,
  nextHtlcId : { var value : Nat },
  publicKeys : Map.Map<Common.LxmfHash, Text>,
  channels : Map.Map<Common.ChannelId, Types.ChannelRecord>,
  nextChannelId : { var value : Nat },
) {
  public func deposit(lxmfHash : Common.LxmfHash, amount : Nat) : async () {
    PaymentsLib.deposit(balances, lxmfHash, amount);
  };

  public query func getBalance(lxmfHash : Common.LxmfHash) : async Nat {
    PaymentsLib.getBalance(balances, lxmfHash);
  };

  public func lockHTLC(
    senderLxmfHash : Common.LxmfHash,
    receiverLxmfHash : Common.LxmfHash,
    amount : Nat,
    paymentHash : Text,
    expirySeconds : Nat,
    signature : Text,
  ) : async Common.HtlcId {
    PaymentsLib.lockHTLC(balances, htlcs, eventLog, nextHtlcId, publicKeys, senderLxmfHash, receiverLxmfHash, amount, paymentHash, expirySeconds, signature);
  };

  public func releaseHTLC(htlcId : Common.HtlcId, preimage : Text) : async () {
    PaymentsLib.releaseHTLC(balances, htlcs, eventLog, htlcId, preimage);
  };

  public func refundHTLC(htlcId : Common.HtlcId) : async () {
    PaymentsLib.refundHTLC(balances, htlcs, eventLog, htlcId);
  };

  public query func getHTLC(htlcId : Common.HtlcId) : async ?Types.HtlcRecord {
    PaymentsLib.getHTLC(htlcs, htlcId);
  };

  public query func listHTLCsForAddress(lxmfHash : Common.LxmfHash) : async [Types.HtlcRecord] {
    PaymentsLib.listHTLCsForAddress(htlcs, lxmfHash);
  };

  public func registerPublicKey(lxmfHash : Common.LxmfHash, publicKeyHex : Text) : async () {
    PaymentsLib.registerPublicKey(publicKeys, eventLog, lxmfHash, publicKeyHex);
  };

  public func openChannel(
    partyA : Common.LxmfHash,
    partyB : Common.LxmfHash,
    amountA : Nat,
    signature : Text,
  ) : async Common.ChannelId {
    PaymentsLib.openChannel(balances, channels, eventLog, nextChannelId, publicKeys, partyA, partyB, amountA, signature);
  };

  public func joinChannel(
    channelId : Common.ChannelId,
    partyB : Common.LxmfHash,
    amountB : Nat,
    signature : Text,
  ) : async () {
    PaymentsLib.joinChannel(balances, channels, eventLog, publicKeys, channelId, partyB, amountB, signature);
  };

  public func closeChannelCooperative(
    channelId : Common.ChannelId,
    finalBalanceA : Nat,
    finalBalanceB : Nat,
    sigA : Text,
    sigB : Text,
  ) : async () {
    PaymentsLib.closeChannelCooperative(balances, channels, eventLog, publicKeys, channelId, finalBalanceA, finalBalanceB, sigA, sigB);
  };

  public query func getChannel(channelId : Common.ChannelId) : async ?Types.ChannelRecord {
    PaymentsLib.getChannel(channels, channelId);
  };

  public query func listChannelsForAddress(lxmfHash : Common.LxmfHash) : async [Types.ChannelRecord] {
    PaymentsLib.listChannelsForAddress(channels, lxmfHash);
  };

  public query func getRegisteredPublicKey(lxmfHash : Common.LxmfHash) : async ?Text {
    PaymentsLib.getRegisteredPublicKey(publicKeys, lxmfHash);
  };
};
