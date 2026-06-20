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
};
