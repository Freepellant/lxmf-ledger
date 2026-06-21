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
import Ed25519 "mo:ed25519";
import Int "mo:core/Int";
import Debug "mo:core/Debug";

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
    publicKeys : Map.Map<Common.LxmfHash, Text>,
    nonces : Map.Map<Common.LxmfHash, Nat>,
    senderLxmfHash : Common.LxmfHash,
    receiverLxmfHash : Common.LxmfHash,
    amount : Nat,
    paymentHash : Text,
    expirySeconds : Nat,
    nonce : Nat,
    signature : Text,
  ) : Common.HtlcId {
    // 1. Nonce check BEFORE signature verification
    let currentNonce = getNonce(nonces, senderLxmfHash);
    if (nonce != currentNonce) {
      Runtime.trap("invalid nonce - expected " # currentNonce.toText() # ", got " # nonce.toText());
    };

    // 2. Require registered public key
    let pubKeyHex = switch (publicKeys.get(senderLxmfHash)) {
      case (?pk) { pk };
      case (null) { Runtime.trap("sender has no registered public key — call registerPublicKey first") };
    };

    // 3. Verify signature
    let message = senderLxmfHash # "|" # receiverLxmfHash # "|" # amount.toText() # "|" # paymentHash # "|" # expirySeconds.toText() # "|" # nonce.toText();
    let messageBytes = message.encodeUtf8().toArray();
    let signatureBytes = Ed25519.Utils.hexToBytes(signature);
    let pubKeyBytes = Ed25519.Utils.hexToBytes(pubKeyHex);
    let valid = Ed25519.ED25519.verify(signatureBytes, messageBytes, pubKeyBytes);
    if (not valid) {
      Runtime.trap("invalid signature — lock not authorized by sender");
    };

    // 4. Check balance
    let senderBalance = getBalance(balances, senderLxmfHash);
    if (senderBalance < amount) {
      Runtime.trap("insufficient balance");
    };

    // 5. Deduct balance
    balances.add(senderLxmfHash, senderBalance - amount);

    // 6. Create HTLC
    let htlcId = nextHtlcId.value.toText();
    nextHtlcId.value += 1;
    let now = Int.abs(Time.now());
    let expiry = now + (expirySeconds * 1_000_000_000);
    let record = {
      id = htlcId;
      senderLxmfHash;
      receiverLxmfHash;
      amount;
      paymentHash;
      expiry;
      status = #Locked;
    };
    htlcs.add(htlcId, record);

    // 7. Log
    let logEntry = "HTLC locked: id=" # htlcId # " sender=" # senderLxmfHash # " receiver=" # receiverLxmfHash # " amount=" # amount.toText() # " hash=" # paymentHash # " expiry=" # expiry.toText();
    eventLog.add(logEntry);

    // 8. Increment nonce only after full success
    nonces.add(senderLxmfHash, currentNonce + 1);

    htlcId
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

  public func registerPublicKey(
    publicKeys : Map.Map<Common.LxmfHash, Text>,
    eventLog : List.List<Types.EventLogEntry>,
    lxmfHash : Common.LxmfHash,
    publicKeyHex : Text,
  ) {
    switch (publicKeys.get(lxmfHash)) {
      case (?_existing) {
        let logEntry = "Public key registration rejected: lxmfHash=" # lxmfHash # " — key already registered";
        eventLog.add(logEntry);
        Runtime.trap("Public key already registered for this LXMF hash");
      };
      case (null) {
        publicKeys.add(lxmfHash, publicKeyHex);
        let logEntry = "Public key registered: lxmfHash=" # lxmfHash;
        eventLog.add(logEntry);
      };
    };
  };

  public func openChannel(
    balances : Map.Map<Common.LxmfHash, Nat>,
    channels : Map.Map<Common.ChannelId, Types.ChannelRecord>,
    eventLog : List.List<Types.EventLogEntry>,
    nextChannelId : { var value : Nat },
    publicKeys : Map.Map<Common.LxmfHash, Text>,
    nonces : Map.Map<Common.LxmfHash, Nat>,
    partyA : Common.LxmfHash,
    partyB : Common.LxmfHash,
    amountA : Nat,
    nonce : Nat,
    signature : Text,
  ) : Common.ChannelId {
    // 1. Nonce check BEFORE signature verification
    let currentNonce = getNonce(nonces, partyA);
    if (nonce != currentNonce) {
      Runtime.trap("invalid nonce - expected " # currentNonce.toText() # ", got " # nonce.toText());
    };

    // 2. Require registered public key
    let pubKeyHex = switch (publicKeys.get(partyA)) {
      case (?pk) { pk };
      case (null) { Runtime.trap("partyA has no registered public key — call registerPublicKey first") };
    };

    // 3. Verify signature
    let message = partyA # "|" # partyB # "|" # amountA.toText() # "|" # nonce.toText();
    let messageBytes = message.encodeUtf8().toArray();
    let signatureBytes = Ed25519.Utils.hexToBytes(signature);
    let pubKeyBytes = Ed25519.Utils.hexToBytes(pubKeyHex);
    let valid = Ed25519.ED25519.verify(signatureBytes, messageBytes, pubKeyBytes);
    if (not valid) {
      Runtime.trap("invalid signature — open channel not authorized by partyA");
    };

    // 4. Check balance
    let partyABalance = getBalance(balances, partyA);
    if (partyABalance < amountA) {
      Runtime.trap("insufficient balance");
    };

    // 5. Deduct balance
    balances.add(partyA, partyABalance - amountA);

    // 6. Create channel
    let channelId = nextChannelId.value.toText();
    nextChannelId.value += 1;
    let record = {
      id = channelId;
      partyA;
      partyB;
      lockedA = amountA;
      lockedB = 0;
      status = #Open;
    };
    channels.add(channelId, record);

    // 7. Log
    let logEntry = "Channel opened: id=" # channelId # " partyA=" # partyA # " partyB=" # partyB # " lockedA=" # amountA.toText();
    eventLog.add(logEntry);

    // 8. Increment nonce only after full success
    nonces.add(partyA, currentNonce + 1);

    channelId
  };

  public func joinChannel(
    balances : Map.Map<Common.LxmfHash, Nat>,
    channels : Map.Map<Common.ChannelId, Types.ChannelRecord>,
    eventLog : List.List<Types.EventLogEntry>,
    publicKeys : Map.Map<Common.LxmfHash, Text>,
    nonces : Map.Map<Common.LxmfHash, Nat>,
    channelId : Common.ChannelId,
    partyB : Common.LxmfHash,
    amountB : Nat,
    nonce : Nat,
    signature : Text,
  ) {
    // 1. Verify channel exists and is open
    let channel = switch (channels.get(channelId)) {
      case (?c) { c };
      case (null) { Runtime.trap("channel not found") };
    };
    if (channel.status != #Open) {
      Runtime.trap("channel is not open");
    };
    if (channel.partyB != partyB) {
      Runtime.trap("partyB does not match channel's partyB");
    };

    // 2. Nonce check BEFORE signature verification
    let currentNonce = getNonce(nonces, partyB);
    if (nonce != currentNonce) {
      Runtime.trap("invalid nonce - expected " # currentNonce.toText() # ", got " # nonce.toText());
    };

    // 3. Require registered public key
    let pubKeyHex = switch (publicKeys.get(partyB)) {
      case (?pk) { pk };
      case (null) { Runtime.trap("partyB has no registered public key — call registerPublicKey first") };
    };

    // 4. Verify signature
    let message = channelId # "|" # partyB # "|" # amountB.toText() # "|" # nonce.toText();
    let messageBytes = message.encodeUtf8().toArray();
    let signatureBytes = Ed25519.Utils.hexToBytes(signature);
    let pubKeyBytes = Ed25519.Utils.hexToBytes(pubKeyHex);
    let valid = Ed25519.ED25519.verify(signatureBytes, messageBytes, pubKeyBytes);
    if (not valid) {
      Runtime.trap("invalid signature — join channel not authorized by partyB");
    };

    // 5. Check balance
    let partyBBalance = getBalance(balances, partyB);
    if (partyBBalance < amountB) {
      Runtime.trap("insufficient balance");
    };

    // 6. Deduct balance
    balances.add(partyB, partyBBalance - amountB);

    // 7. Update channel
    let updated = { channel with lockedB = amountB };
    channels.add(channelId, updated);

    // 8. Log
    let logEntry = "Channel joined: id=" # channelId # " partyB=" # partyB # " lockedB=" # amountB.toText();
    eventLog.add(logEntry);

    // 9. Increment nonce only after full success
    nonces.add(partyB, currentNonce + 1);
  };

  public func closeChannelCooperative(
    balances : Map.Map<Common.LxmfHash, Nat>,
    channels : Map.Map<Common.ChannelId, Types.ChannelRecord>,
    eventLog : List.List<Types.EventLogEntry>,
    publicKeys : Map.Map<Common.LxmfHash, Text>,
    nonces : Map.Map<Common.LxmfHash, Nat>,
    channelId : Common.ChannelId,
    finalBalanceA : Nat,
    finalBalanceB : Nat,
    nonceA : Nat,
    nonceB : Nat,
    sigA : Text,
    sigB : Text,
  ) {
    // 1. Verify channel exists and is open
    let channel = switch (channels.get(channelId)) {
      case (?c) { c };
      case (null) { Runtime.trap("channel not found") };
    };
    if (channel.status != #Open) {
      Runtime.trap("channel is not open");
    };

    // 2. Verify final balances sum to total locked
    let totalLocked = channel.lockedA + channel.lockedB;
    if (finalBalanceA + finalBalanceB != totalLocked) {
      Runtime.trap("final balances must sum to total locked funds");
    };

    // 3. Dual nonce check BEFORE any signature verification
    let currentNonceA = getNonce(nonces, channel.partyA);
    if (nonceA != currentNonceA) {
      Runtime.trap("invalid nonce - expected " # currentNonceA.toText() # ", got " # nonceA.toText());
    };
    let currentNonceB = getNonce(nonces, channel.partyB);
    if (nonceB != currentNonceB) {
      Runtime.trap("invalid nonce - expected " # currentNonceB.toText() # ", got " # nonceB.toText());
    };

    // 4. Require registered public keys
    let pubKeyAHex = switch (publicKeys.get(channel.partyA)) {
      case (?pk) { pk };
      case (null) { Runtime.trap("partyA has no registered public key") };
    };
    let pubKeyBHex = switch (publicKeys.get(channel.partyB)) {
      case (?pk) { pk };
      case (null) { Runtime.trap("partyB has no registered public key") };
    };

    // 5. Verify both signatures
    let message = channelId # "|" # finalBalanceA.toText() # "|" # finalBalanceB.toText() # "|" # nonceA.toText() # "|" # nonceB.toText();
    let messageBytes = message.encodeUtf8().toArray();
    let sigABytes = Ed25519.Utils.hexToBytes(sigA);
    let sigBBytes = Ed25519.Utils.hexToBytes(sigB);
    let pubKeyABytes = Ed25519.Utils.hexToBytes(pubKeyAHex);
    let pubKeyBBytes = Ed25519.Utils.hexToBytes(pubKeyBHex);

    let validA = Ed25519.ED25519.verify(sigABytes, messageBytes, pubKeyABytes);
    let validB = Ed25519.ED25519.verify(sigBBytes, messageBytes, pubKeyBBytes);
    if (not validA or not validB) {
      Runtime.trap("invalid signature — cooperative close not authorized by both parties");
    };

    // 6. Payout
    let partyABalance = getBalance(balances, channel.partyA);
    balances.add(channel.partyA, partyABalance + finalBalanceA);

    let partyBBalance = getBalance(balances, channel.partyB);
    balances.add(channel.partyB, partyBBalance + finalBalanceB);

    // 7. Close channel
    let updated = { channel with status = #Closed };
    channels.add(channelId, updated);

    // 8. Log
    let logEntry = "Channel closed cooperatively: id=" # channelId # " finalBalanceA=" # finalBalanceA.toText() # " finalBalanceB=" # finalBalanceB.toText();
    eventLog.add(logEntry);

    // 9. Increment both nonces only after full success
    nonces.add(channel.partyA, currentNonceA + 1);
    nonces.add(channel.partyB, currentNonceB + 1);
  };

  public func getChannel(channels : Map.Map<Common.ChannelId, Types.ChannelRecord>, channelId : Common.ChannelId) : ?Types.ChannelRecord {
    channels.get(channelId);
  };

  public func listChannelsForAddress(channels : Map.Map<Common.ChannelId, Types.ChannelRecord>, lxmfHash : Common.LxmfHash) : [Types.ChannelRecord] {
    var result = List.empty<Types.ChannelRecord>();
    for ((_, record) in channels.entries()) {
      if (record.partyA == lxmfHash or record.partyB == lxmfHash) {
        result.add(record);
      };
    };
    result.toArray();
  };

  public func getRegisteredPublicKey(publicKeys : Map.Map<Common.LxmfHash, Text>, lxmfHash : Common.LxmfHash) : ?Text {
    publicKeys.get(lxmfHash);
  };

  public func getNonce(nonces : Map.Map<Common.LxmfHash, Nat>, lxmfHash : Common.LxmfHash) : Nat {
    switch (nonces.get(lxmfHash)) {
      case (?n) { n };
      case (null) { 0 };
    };
  };
};
