import Runtime "mo:core/Runtime";
import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Sha256 "mo:sha2/Sha256";
import Common "../types/common";
import Types "../types/payments";
import Blob "mo:core/Blob";
import Nat8 "mo:core/Nat8";

module {
  func blobToHex(blob : Blob) : Text {
    let bytes = blob.toArray();
    let hexChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
    var result = "";
    for (byte in bytes.vals()) {
      let high = Nat8.toNat(byte / 16);
      let low = Nat8.toNat(byte % 16);
      result := result # hexChars[high] # hexChars[low];
    };
    result;
  };

  public func deposit(balances : Map.Map<Common.LxmfHash, Nat>, lxmfHash : Common.LxmfHash, amount : Nat) {
    // Test faucet deposit — in production this would verify an ICP ledger transfer
    let current = switch (balances.get(lxmfHash)) {
      case (?b) { b };
      case (null) { 0 };
    };
    balances.add(lxmfHash, current + amount);
  };

  public func getBalance(balances : Map.Map<Common.LxmfHash, Nat>, lxmfHash : Common.LxmfHash) : Nat {
    switch (balances.get(lxmfHash)) {
      case (?b) { b };
      case (null) { 0 };
    };
  };

  public func lockHTLC(
    balances : Map.Map<Common.LxmfHash, Nat>,
    htlcs : Map.Map<Common.HtlcId, Types.HtlcRecord>,
    eventLog : List.List<Types.EventLogEntry>,
    nextHtlcId : { var value : Nat },
    senderLxmfHash : Common.LxmfHash,
    receiverLxmfHash : Common.LxmfHash,
    amount : Nat,
    paymentHash : Text,
    expirySeconds : Nat,
  ) : Common.HtlcId {
    let currentBalance = getBalance(balances, senderLxmfHash);
    if (currentBalance < amount) {
      Runtime.trap("Insufficient balance");
    };

    balances.add(senderLxmfHash, currentBalance - amount);

    let htlcId = nextHtlcId.value.toText();
    nextHtlcId.value += 1;

    let expiry = Int.abs(Time.now()) + expirySeconds * 1_000_000_000;

    let record : Types.HtlcRecord = {
      id = htlcId;
      senderLxmfHash;
      receiverLxmfHash;
      amount;
      paymentHash;
      expiry;
      status = #Locked;
    };

    htlcs.add(htlcId, record);

    let logEntry = "HTLC locked: id=" # htlcId # " sender=" # senderLxmfHash # " receiver=" # receiverLxmfHash # " amount=" # amount.toText() # " hash=" # paymentHash # " expiry=" # expiry.toText();
    eventLog.add(logEntry);

    htlcId;
  };

  public func releaseHTLC(
    balances : Map.Map<Common.LxmfHash, Nat>,
    htlcs : Map.Map<Common.HtlcId, Types.HtlcRecord>,
    eventLog : List.List<Types.EventLogEntry>,
    htlcId : Common.HtlcId,
    preimage : Text,
  ) {
    let htlc = switch (htlcs.get(htlcId)) {
      case (?h) { h };
      case (null) { Runtime.trap("HTLC not found") };
    };

    if (htlc.status != #Locked) {
      Runtime.trap("HTLC is not locked");
    };

    let now = Int.abs(Time.now());
    if (now >= htlc.expiry) {
      Runtime.trap("HTLC has expired");
    };

    let hash = Sha256.fromBlob(preimage.encodeUtf8());
    let hashHex = blobToHex(hash);
    if (hashHex != htlc.paymentHash) {
      Runtime.trap("Invalid preimage");
    };

    let receiverBalance = getBalance(balances, htlc.receiverLxmfHash);
    balances.add(htlc.receiverLxmfHash, receiverBalance + htlc.amount);

    let updated = { htlc with status = #Released };
    htlcs.add(htlcId, updated);

    let logEntry = "HTLC released: id=" # htlcId # " preimage_revealed=" # preimage # " paid_to=" # htlc.receiverLxmfHash;
    eventLog.add(logEntry);
  };

  public func refundHTLC(
    balances : Map.Map<Common.LxmfHash, Nat>,
    htlcs : Map.Map<Common.HtlcId, Types.HtlcRecord>,
    eventLog : List.List<Types.EventLogEntry>,
    htlcId : Common.HtlcId,
  ) {
    let htlc = switch (htlcs.get(htlcId)) {
      case (?h) { h };
      case (null) { Runtime.trap("HTLC not found") };
    };

    if (htlc.status != #Locked) {
      Runtime.trap("HTLC is not locked");
    };

    let now = Int.abs(Time.now());
    if (now < htlc.expiry) {
      Runtime.trap("HTLC has not expired yet");
    };

    let senderBalance = getBalance(balances, htlc.senderLxmfHash);
    balances.add(htlc.senderLxmfHash, senderBalance + htlc.amount);

    let updated = { htlc with status = #Refunded };
    htlcs.add(htlcId, updated);

    let logEntry = "HTLC refunded: id=" # htlcId # " returned_to=" # htlc.senderLxmfHash;
    eventLog.add(logEntry);
  };

  public func getHTLC(htlcs : Map.Map<Common.HtlcId, Types.HtlcRecord>, htlcId : Common.HtlcId) : ?Types.HtlcRecord {
    htlcs.get(htlcId);
  };

  public func listHTLCsForAddress(htlcs : Map.Map<Common.HtlcId, Types.HtlcRecord>, lxmfHash : Common.LxmfHash) : [Types.HtlcRecord] {
    var result = List.empty<Types.HtlcRecord>();
    for ((_, record) in htlcs.entries()) {
      if (record.senderLxmfHash == lxmfHash or record.receiverLxmfHash == lxmfHash) {
        result.add(record);
      };
    };
    result.toArray();
  };
};
