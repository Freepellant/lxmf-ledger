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
  ) : async Common.HtlcId {
    PaymentsLib.lockHTLC(balances, htlcs, eventLog, nextHtlcId, senderLxmfHash, receiverLxmfHash, amount, paymentHash, expirySeconds);
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
};
