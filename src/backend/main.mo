import Map "mo:core/Map";
import List "mo:core/List";
import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import Common "types/common";
import Types "types/payments";
import PaymentsMixin "mixins/payments-api";

actor {
  let balances : Map.Map<Common.LxmfHash, Nat>;
  let htlcs : Map.Map<Common.HtlcId, Types.HtlcRecord>;
  let eventLog : List.List<Types.EventLogEntry>;
  let nextHtlcId : { var value : Nat };
  let publicKeys : Map.Map<Common.LxmfHash, Text>;

  include MixinViews();
  include PaymentsMixin(balances, htlcs, eventLog, nextHtlcId, publicKeys);
};
