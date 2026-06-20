import Map "mo:core/Map";
import List "mo:core/List";

module {
  type OldActor = {
    balances : Map.Map<Text, Nat>;
    htlcs : Map.Map<Text, {
      id : Text;
      senderLxmfHash : Text;
      receiverLxmfHash : Text;
      amount : Nat;
      paymentHash : Text;
      expiry : Nat;
      status : { #Locked; #Released; #Refunded };
    }>;
    eventLog : List.List<Text>;
    nextHtlcId : { var value : Nat };
  };

  type NewActor = {
    balances : Map.Map<Text, Nat>;
    htlcs : Map.Map<Text, {
      id : Text;
      senderLxmfHash : Text;
      receiverLxmfHash : Text;
      amount : Nat;
      paymentHash : Text;
      expiry : Nat;
      status : { #Locked; #Released; #Refunded };
    }>;
    eventLog : List.List<Text>;
    nextHtlcId : { var value : Nat };
    publicKeys : Map.Map<Text, Text>;
  };

  public func migration(old : OldActor) : NewActor {
    {
      balances = old.balances;
      htlcs = old.htlcs;
      eventLog = old.eventLog;
      nextHtlcId = old.nextHtlcId;
      publicKeys = Map.empty<Text, Text>();
    };
  };
};
