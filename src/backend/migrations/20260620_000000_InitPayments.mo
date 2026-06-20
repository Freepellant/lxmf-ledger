import Map "mo:core/Map";
import List "mo:core/List";

module {
  type OldActor = {};

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
  };

  public func migration(_old : OldActor) : NewActor {
    {
      balances = Map.empty<Text, Nat>();
      htlcs = Map.empty<Text, {
        id : Text;
        senderLxmfHash : Text;
        receiverLxmfHash : Text;
        amount : Nat;
        paymentHash : Text;
        expiry : Nat;
        status : { #Locked; #Released; #Refunded };
      }>();
      eventLog = List.empty<Text>();
      nextHtlcId = { var value = 0 };
    };
  };
};
