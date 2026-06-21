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
    publicKeys : Map.Map<Text, Text>;
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
    channels : Map.Map<Text, {
      id : Text;
      partyA : Text;
      partyB : Text;
      lockedA : Nat;
      lockedB : Nat;
      status : { #Open; #Closed };
    }>;
    nextChannelId : { var value : Nat };
  };

  public func migration(old : OldActor) : NewActor {
    {
      balances = old.balances;
      htlcs = old.htlcs;
      eventLog = old.eventLog;
      nextHtlcId = old.nextHtlcId;
      publicKeys = old.publicKeys;
      channels = Map.empty<Text, {
        id : Text;
        partyA : Text;
        partyB : Text;
        lockedA : Nat;
        lockedB : Nat;
        status : { #Open; #Closed };
      }>();
      nextChannelId = { var value = 0 };
    };
  };
};
