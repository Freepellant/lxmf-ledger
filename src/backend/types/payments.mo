import Common "common";

module {
  public type HtlcStatus = {
    #Locked;
    #Released;
    #Refunded;
  };

  public type HtlcRecord = {
    id : Common.HtlcId;
    senderLxmfHash : Common.LxmfHash;
    receiverLxmfHash : Common.LxmfHash;
    amount : Nat;
    paymentHash : Text;
    expiry : Common.Timestamp;
    status : HtlcStatus;
  };

  public type EventLogEntry = Text;

  public type ChannelStatus = {
    #Open;
    #Closed;
  };

  public type ChannelRecord = {
    id : Common.ChannelId;
    partyA : Common.LxmfHash;
    partyB : Common.LxmfHash;
    lockedA : Nat;
    lockedB : Nat;
    status : ChannelStatus;
  };
};
