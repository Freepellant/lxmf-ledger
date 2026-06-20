import { createActor } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useGetBalance(lxmfHash: string) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<bigint>({
    queryKey: ["balance", lxmfHash],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getBalance(lxmfHash);
    },
    enabled: !!actor && !isFetching && lxmfHash.length > 0,
    refetchInterval: 5000,
  });
}

export function useListHTLCs(lxmfHash: string) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["htlcs", lxmfHash],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listHTLCsForAddress(lxmfHash);
    },
    enabled: !!actor && !isFetching && lxmfHash.length > 0,
    refetchInterval: 5000,
  });
}

export function useEventLog() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["eventLog"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.__eventLog(null, null);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useDeposit() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lxmfHash,
      amount,
    }: { lxmfHash: string; amount: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deposit(lxmfHash, amount);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["balance", variables.lxmfHash],
      });
      queryClient.invalidateQueries({ queryKey: ["eventLog"] });
      toast.success("Test funds deposited successfully");
    },
    onError: (error) => {
      toast.error(
        `Deposit failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    },
  });
}

export function useLockHTLC() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      senderLxmfHash: string;
      receiverLxmfHash: string;
      amount: bigint;
      paymentHash: string;
      expirySeconds: bigint;
      signature: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.lockHTLC(
        params.senderLxmfHash,
        params.receiverLxmfHash,
        params.amount,
        params.paymentHash,
        params.expirySeconds,
        params.signature,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["htlcs", variables.senderLxmfHash],
      });
      queryClient.invalidateQueries({
        queryKey: ["htlcs", variables.receiverLxmfHash],
      });
      queryClient.invalidateQueries({
        queryKey: ["balance", variables.senderLxmfHash],
      });
      queryClient.invalidateQueries({ queryKey: ["eventLog"] });
      toast.success("HTLC locked successfully");
    },
    onError: (error) => {
      toast.error(
        `Lock HTLC failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    },
  });
}

export function useReleaseHTLC() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      htlcId,
      preimage,
    }: { htlcId: string; preimage: string; lxmfHash: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.releaseHTLC(htlcId, preimage);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["htlcs", variables.lxmfHash],
      });
      queryClient.invalidateQueries({
        queryKey: ["balance", variables.lxmfHash],
      });
      queryClient.invalidateQueries({ queryKey: ["eventLog"] });
      toast.success("HTLC released successfully");
    },
    onError: (error) => {
      toast.error(
        `Release failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    },
  });
}

export function useGetRegisteredPublicKey(lxmfHash: string) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<string | null>({
    queryKey: ["publicKey", lxmfHash],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getRegisteredPublicKey(lxmfHash);
    },
    enabled: !!actor && !isFetching && lxmfHash.length > 0,
    refetchInterval: 5000,
  });
}

export function useRegisterPublicKey() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lxmfHash,
      publicKeyHex,
    }: { lxmfHash: string; publicKeyHex: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.registerPublicKey(lxmfHash, publicKeyHex);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["publicKey", variables.lxmfHash],
      });
      queryClient.invalidateQueries({ queryKey: ["eventLog"] });
      toast.success("Public key registered successfully");
    },
    onError: (error) => {
      toast.error(
        `Registration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    },
  });
}

export function useRefundHTLC() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ htlcId }: { htlcId: string; lxmfHash: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.refundHTLC(htlcId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["htlcs", variables.lxmfHash],
      });
      queryClient.invalidateQueries({
        queryKey: ["balance", variables.lxmfHash],
      });
      queryClient.invalidateQueries({ queryKey: ["eventLog"] });
      toast.success("HTLC refunded successfully");
    },
    onError: (error) => {
      toast.error(
        `Refund failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    },
  });
}
