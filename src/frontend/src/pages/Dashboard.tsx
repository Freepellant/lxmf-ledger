import { ChannelStatus, HtlcStatus } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCloseChannelCooperative,
  useDeposit,
  useEventLog,
  useGetBalance,
  useGetChannel,
  useGetNonce,
  useGetRegisteredPublicKey,
  useJoinChannel,
  useListChannels,
  useListHTLCs,
  useLockHTLC,
  useOpenChannel,
  useRefundHTLC,
  useRegisterPublicKey,
  useReleaseHTLC,
} from "@/hooks/useQueries";
import {
  Activity,
  ArrowLeftRight,
  Coins,
  Droplets,
  GitBranch,
  GitMerge,
  GitPullRequest,
  Hash,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  Unlock,
  Wallet,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatBalance(n: bigint): string {
  return n.toLocaleString();
}

function truncateHash(hash: string, len = 12): string {
  if (hash.length <= len * 2) return hash;
  return `${hash.slice(0, len)}...${hash.slice(-len)}`;
}

function statusBadge(status: HtlcStatus) {
  switch (status) {
    case HtlcStatus.Locked:
      return (
        <Badge
          variant="secondary"
          className="bg-warning/10 text-warning border-warning/20"
        >
          Locked
        </Badge>
      );
    case HtlcStatus.Released:
      return (
        <Badge
          variant="default"
          className="bg-success/10 text-success border-success/20"
        >
          Released
        </Badge>
      );
    case HtlcStatus.Refunded:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Refunded
        </Badge>
      );
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

export default function Dashboard() {
  const [lxmfHash, setLxmfHash] = useState("");
  const [depositAmount] = useState("1000");
  const [preimageMap, setPreimageMap] = useState<Record<string, string>>({});

  const { data: balance, isLoading: balanceLoading } = useGetBalance(lxmfHash);
  const { data: htlcs, isLoading: htlcsLoading } = useListHTLCs(lxmfHash);
  const { data: channels, isLoading: channelsLoading } =
    useListChannels(lxmfHash);
  const { data: nonce, isLoading: nonceLoading } = useGetNonce(lxmfHash);
  const { data: events, isLoading: eventsLoading } = useEventLog();

  const depositMutation = useDeposit();
  const lockMutation = useLockHTLC();
  const releaseMutation = useReleaseHTLC();
  const refundMutation = useRefundHTLC();
  const openChannelMutation = useOpenChannel();
  const joinChannelMutation = useJoinChannel();
  const closeChannelMutation = useCloseChannelCooperative();

  const [lockForm, setLockForm] = useState({
    sender: "",
    receiver: "",
    amount: "",
    paymentHash: "",
    expiry: "300",
    nonce: "",
    signature: "",
  });

  const [openChannelForm, setOpenChannelForm] = useState({
    partyA: "",
    partyB: "",
    amountA: "",
    nonce: "",
    signature: "",
  });

  const [joinChannelForm, setJoinChannelForm] = useState({
    channelId: "",
    partyB: "",
    amountB: "",
    nonce: "",
    signature: "",
  });

  const [closeChannelForm, setCloseChannelForm] = useState({
    channelId: "",
    finalBalanceA: "",
    finalBalanceB: "",
    nonceA: "",
    nonceB: "",
    sigA: "",
    sigB: "",
  });

  const [publicKeyForm, setPublicKeyForm] = useState({
    lxmfHash: "",
    publicKeyHex: "",
  });

  const { data: registeredPublicKey, isLoading: publicKeyLoading } =
    useGetRegisteredPublicKey(lxmfHash);
  const registerPublicKeyMutation = useRegisterPublicKey();

  // Fetch channel details and nonces for close channel parties
  const { data: closeChannelDetails } = useGetChannel(
    closeChannelForm.channelId || "",
  );
  const { data: nonceA } = useGetNonce(closeChannelDetails?.partyA || "");
  const { data: nonceB } = useGetNonce(closeChannelDetails?.partyB || "");

  const handleDeposit = () => {
    if (!lxmfHash || !depositAmount) return;
    depositMutation.mutate({ lxmfHash, amount: BigInt(depositAmount) });
  };

  const handleLock = () => {
    if (
      !lockForm.sender ||
      !lockForm.receiver ||
      !lockForm.amount ||
      !lockForm.paymentHash ||
      !lockForm.nonce ||
      !lockForm.signature
    )
      return;
    lockMutation.mutate(
      {
        senderLxmfHash: lockForm.sender,
        receiverLxmfHash: lockForm.receiver,
        amount: BigInt(lockForm.amount),
        paymentHash: lockForm.paymentHash,
        expirySeconds: BigInt(lockForm.expiry),
        nonce: BigInt(lockForm.nonce),
        signature: lockForm.signature,
      },
      {
        onError: (error) => {
          const msg = error instanceof Error ? error.message : "Unknown error";
          if (msg.includes("nonce")) {
            toast.error(
              `Nonce mismatch: ${msg}. Current nonce for ${lockForm.sender} is ${nonce ?? 0}. Please re-sign with the correct nonce and resubmit.`,
            );
          }
        },
      },
    );
  };

  const handleRegisterPublicKey = () => {
    if (!publicKeyForm.lxmfHash || !publicKeyForm.publicKeyHex) return;
    if (publicKeyForm.publicKeyHex.length !== 64) {
      toast.error("Public key must be exactly 64 hex characters (32 bytes)");
      return;
    }
    registerPublicKeyMutation.mutate({
      lxmfHash: publicKeyForm.lxmfHash,
      publicKeyHex: publicKeyForm.publicKeyHex,
    });
  };

  const handleRelease = (htlcId: string) => {
    const preimage = preimageMap[htlcId];
    if (!preimage) return;
    releaseMutation.mutate({ htlcId, preimage, lxmfHash });
  };

  const handleRefund = (htlcId: string) => {
    refundMutation.mutate({ htlcId, lxmfHash });
  };

  const handleOpenChannel = () => {
    if (
      !openChannelForm.partyA ||
      !openChannelForm.partyB ||
      !openChannelForm.amountA ||
      !openChannelForm.nonce ||
      !openChannelForm.signature
    )
      return;
    openChannelMutation.mutate(
      {
        partyA: openChannelForm.partyA,
        partyB: openChannelForm.partyB,
        amountA: BigInt(openChannelForm.amountA),
        nonce: BigInt(openChannelForm.nonce),
        signature: openChannelForm.signature,
      },
      {
        onError: (error) => {
          const msg = error instanceof Error ? error.message : "Unknown error";
          if (msg.includes("nonce")) {
            toast.error(
              `Nonce mismatch: ${msg}. Current nonce for ${openChannelForm.partyA} is ${nonce ?? 0}. Please re-sign with the correct nonce and resubmit.`,
            );
          }
        },
      },
    );
  };

  const handleJoinChannel = () => {
    if (
      !joinChannelForm.channelId ||
      !joinChannelForm.partyB ||
      !joinChannelForm.nonce ||
      !joinChannelForm.signature
    )
      return;
    joinChannelMutation.mutate(
      {
        channelId: joinChannelForm.channelId,
        partyB: joinChannelForm.partyB,
        amountB: BigInt(joinChannelForm.amountB || "0"),
        nonce: BigInt(joinChannelForm.nonce),
        signature: joinChannelForm.signature,
      },
      {
        onError: (error) => {
          const msg = error instanceof Error ? error.message : "Unknown error";
          if (msg.includes("nonce")) {
            toast.error(
              `Nonce mismatch: ${msg}. Current nonce for ${joinChannelForm.partyB} is ${nonce ?? 0}. Please re-sign with the correct nonce and resubmit.`,
            );
          }
        },
      },
    );
  };

  const handleCloseChannel = () => {
    if (
      !closeChannelForm.channelId ||
      !closeChannelForm.finalBalanceA ||
      !closeChannelForm.finalBalanceB ||
      !closeChannelForm.nonceA ||
      !closeChannelForm.nonceB ||
      !closeChannelForm.sigA ||
      !closeChannelForm.sigB
    )
      return;
    closeChannelMutation.mutate(
      {
        channelId: closeChannelForm.channelId,
        finalBalanceA: BigInt(closeChannelForm.finalBalanceA),
        finalBalanceB: BigInt(closeChannelForm.finalBalanceB),
        nonceA: BigInt(closeChannelForm.nonceA),
        nonceB: BigInt(closeChannelForm.nonceB),
        sigA: closeChannelForm.sigA,
        sigB: closeChannelForm.sigB,
      },
      {
        onError: (error) => {
          const msg = error instanceof Error ? error.message : "Unknown error";
          if (msg.includes("nonce")) {
            toast.error(
              `Nonce mismatch: ${msg}. Current nonce for Party A is ${nonceA ?? 0}, for Party B is ${nonceB ?? 0}. Please re-sign with the correct nonces and resubmit.`,
            );
          }
        },
      },
    );
  };

  function channelStatusBadge(status: ChannelStatus) {
    switch (status) {
      case ChannelStatus.Open:
        return (
          <Badge
            variant="outline"
            className="text-success border-success/30 bg-success/10 gap-1"
          >
            <GitBranch className="h-3 w-3" />
            Open
          </Badge>
        );
      case ChannelStatus.Closed:
        return (
          <Badge
            variant="outline"
            className="text-muted-foreground border-muted-foreground/30 bg-muted/10 gap-1"
          >
            <XCircle className="h-3 w-3" />
            Closed
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Identity / Balance Section */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label
              htmlFor="lxmf-hash"
              className="text-sm font-medium text-foreground"
            >
              LXMF Identity Hash
            </Label>
            <Input
              id="lxmf-hash"
              data-ocid="dashboard.lxmf_input"
              placeholder="Enter your 16-byte LXMF destination hash (hex)"
              value={lxmfHash}
              onChange={(e) => setLxmfHash(e.target.value)}
              className="font-mono"
            />
          </div>
          <Button
            data-ocid="dashboard.deposit_button"
            onClick={handleDeposit}
            disabled={!lxmfHash || depositMutation.isPending}
            className="gap-2"
          >
            <Droplets className="h-4 w-4" />
            {depositMutation.isPending ? "Depositing..." : "Faucet Deposit"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-muted-foreground">
                <Wallet className="h-4 w-4" />
                Balance
                {publicKeyLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : registeredPublicKey ? (
                  <Badge
                    variant="outline"
                    className="text-success border-success/30 bg-success/10 gap-1"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    Key Registered
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-warning border-warning/30 bg-warning/10 gap-1"
                  >
                    <KeyRound className="h-3 w-3" />
                    No Key
                  </Badge>
                )}
              </CardDescription>
              <CardTitle className="text-3xl font-display">
                {balanceLoading ? (
                  <Skeleton className="h-9 w-32" />
                ) : (
                  `${formatBalance(balance ?? 0n)}`
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                ICP units (demo faucet)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-4 w-4" />
                Active HTLCs
              </CardDescription>
              <CardTitle className="text-3xl font-display">
                {htlcsLoading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  (htlcs?.filter((h) => h.status === HtlcStatus.Locked)
                    .length ?? 0)
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Locked contracts</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-muted-foreground">
                <Hash className="h-4 w-4" />
                Current Nonce
              </CardDescription>
              <CardTitle className="text-3xl font-display">
                {nonceLoading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  `${formatBalance(nonce ?? 0n)}`
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Next nonce for signing
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Public Key Registration */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          Register Public Key
        </h2>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reg-lxmf-hash">LXMF Hash</Label>
                <Input
                  id="reg-lxmf-hash"
                  data-ocid="publickey.lxmf_input"
                  placeholder="Enter LXMF hash to register key for"
                  value={publicKeyForm.lxmfHash}
                  onChange={(e) =>
                    setPublicKeyForm((f) => ({
                      ...f,
                      lxmfHash: e.target.value,
                    }))
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="public-key-hex">
                  Public Key (hex, 64 chars)
                </Label>
                <Input
                  id="public-key-hex"
                  data-ocid="publickey.key_input"
                  placeholder="Hex-encoded Ed25519 public key"
                  value={publicKeyForm.publicKeyHex}
                  onChange={(e) =>
                    setPublicKeyForm((f) => ({
                      ...f,
                      publicKeyHex: e.target.value,
                    }))
                  }
                  className="font-mono"
                />
              </div>
            </div>
            <Button
              data-ocid="publickey.register_button"
              onClick={handleRegisterPublicKey}
              disabled={
                registerPublicKeyMutation.isPending ||
                !publicKeyForm.lxmfHash ||
                !publicKeyForm.publicKeyHex
              }
              className="gap-2"
            >
              <KeyRound className="h-4 w-4" />
              {registerPublicKeyMutation.isPending
                ? "Registering..."
                : "Register Public Key"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Create HTLC Form */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          Create HTLC
        </h2>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sender">Sender LXMF Hash</Label>
                <Input
                  id="sender"
                  data-ocid="htlc.sender_input"
                  placeholder="Sender hash"
                  value={lockForm.sender}
                  onChange={(e) =>
                    setLockForm((f) => ({ ...f, sender: e.target.value }))
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiver">Receiver LXMF Hash</Label>
                <Input
                  id="receiver"
                  data-ocid="htlc.receiver_input"
                  placeholder="Receiver hash"
                  value={lockForm.receiver}
                  onChange={(e) =>
                    setLockForm((f) => ({ ...f, receiver: e.target.value }))
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  data-ocid="htlc.amount_input"
                  type="number"
                  placeholder="Amount to lock"
                  value={lockForm.amount}
                  onChange={(e) =>
                    setLockForm((f) => ({ ...f, amount: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry (seconds)</Label>
                <Input
                  id="expiry"
                  data-ocid="htlc.expiry_input"
                  type="number"
                  placeholder="300"
                  value={lockForm.expiry}
                  onChange={(e) =>
                    setLockForm((f) => ({ ...f, expiry: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-hash">Payment Hash (SHA-256 hex)</Label>
              <Input
                id="payment-hash"
                data-ocid="htlc.payment_hash_input"
                placeholder="Hex-encoded SHA-256 hash of the preimage"
                value={lockForm.paymentHash}
                onChange={(e) =>
                  setLockForm((f) => ({ ...f, paymentHash: e.target.value }))
                }
                className="font-mono"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nonce">Nonce</Label>
                <Input
                  id="nonce"
                  data-ocid="htlc.nonce_input"
                  type="number"
                  placeholder="Current nonce"
                  value={lockForm.nonce}
                  onChange={(e) =>
                    setLockForm((f) => ({ ...f, nonce: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signature">Signature (hex)</Label>
                <Input
                  id="signature"
                  data-ocid="htlc.signature_input"
                  placeholder="Ed25519 signature over the message below"
                  value={lockForm.signature}
                  onChange={(e) =>
                    setLockForm((f) => ({ ...f, signature: e.target.value }))
                  }
                  className="font-mono"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Sign the exact pipe-separated message below with your Ed25519
              private key offline. The frontend does not generate or store
              private keys.
            </p>
            {lockForm.sender &&
              lockForm.receiver &&
              lockForm.amount &&
              lockForm.paymentHash && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs font-medium text-foreground">
                    Message to sign:
                  </p>
                  <code className="block text-xs font-mono text-muted-foreground break-all">
                    {lockForm.sender}|{lockForm.receiver}|{lockForm.amount}|
                    {lockForm.paymentHash}|{lockForm.expiry}|
                    {lockForm.nonce || "0"}
                  </code>
                </div>
              )}
            <Button
              data-ocid="htlc.lock_button"
              onClick={handleLock}
              disabled={
                lockMutation.isPending ||
                !lockForm.sender ||
                !lockForm.receiver ||
                !lockForm.amount ||
                !lockForm.paymentHash ||
                !lockForm.signature
              }
              className="gap-2"
            >
              <Lock className="h-4 w-4" />
              {lockMutation.isPending ? "Locking..." : "Lock HTLC"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Channels Panel */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          Payment Channels
        </h2>

        {/* Open Channel Form */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-primary" />
              Open Channel
            </CardTitle>
            <CardDescription>
              Lock funds from partyA to open a new channel with partyB.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="open-party-a">Party A (opener)</Label>
                <Input
                  id="open-party-a"
                  data-ocid="channel.open_party_a_input"
                  placeholder="LXMF hash"
                  value={openChannelForm.partyA}
                  onChange={(e) =>
                    setOpenChannelForm((f) => ({
                      ...f,
                      partyA: e.target.value,
                    }))
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="open-party-b">Party B (counterparty)</Label>
                <Input
                  id="open-party-b"
                  data-ocid="channel.open_party_b_input"
                  placeholder="LXMF hash"
                  value={openChannelForm.partyB}
                  onChange={(e) =>
                    setOpenChannelForm((f) => ({
                      ...f,
                      partyB: e.target.value,
                    }))
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="open-amount-a">Amount A</Label>
                <Input
                  id="open-amount-a"
                  data-ocid="channel.open_amount_a_input"
                  type="number"
                  placeholder="Amount to lock"
                  value={openChannelForm.amountA}
                  onChange={(e) =>
                    setOpenChannelForm((f) => ({
                      ...f,
                      amountA: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="open-nonce">Nonce</Label>
                <Input
                  id="open-nonce"
                  data-ocid="channel.open_nonce_input"
                  type="number"
                  placeholder="Current nonce"
                  value={openChannelForm.nonce}
                  onChange={(e) =>
                    setOpenChannelForm((f) => ({
                      ...f,
                      nonce: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="open-signature">Signature (hex)</Label>
                <Input
                  id="open-signature"
                  data-ocid="channel.open_signature_input"
                  placeholder="Ed25519 signature"
                  value={openChannelForm.signature}
                  onChange={(e) =>
                    setOpenChannelForm((f) => ({
                      ...f,
                      signature: e.target.value,
                    }))
                  }
                  className="font-mono"
                />
              </div>
            </div>
            {openChannelForm.partyA &&
              openChannelForm.partyB &&
              openChannelForm.amountA && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs font-medium text-foreground">
                    Message to sign:
                  </p>
                  <code className="block text-xs font-mono text-muted-foreground break-all">
                    {openChannelForm.partyA}|{openChannelForm.partyB}|
                    {openChannelForm.amountA}|{openChannelForm.nonce || "0"}
                  </code>
                </div>
              )}
            <Button
              data-ocid="channel.open_button"
              onClick={handleOpenChannel}
              disabled={
                openChannelMutation.isPending ||
                !openChannelForm.partyA ||
                !openChannelForm.partyB ||
                !openChannelForm.amountA ||
                !openChannelForm.signature
              }
              className="gap-2"
            >
              <GitPullRequest className="h-4 w-4" />
              {openChannelMutation.isPending ? "Opening..." : "Open Channel"}
            </Button>
          </CardContent>
        </Card>

        {/* Join Channel Form */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-primary" />
              Join Channel
            </CardTitle>
            <CardDescription>
              Party B joins an open channel and optionally locks additional
              funds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="join-channel-id">Channel ID</Label>
                <Input
                  id="join-channel-id"
                  data-ocid="channel.join_channel_id_input"
                  placeholder="Channel ID"
                  value={joinChannelForm.channelId}
                  onChange={(e) =>
                    setJoinChannelForm((f) => ({
                      ...f,
                      channelId: e.target.value,
                    }))
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-party-b">Party B</Label>
                <Input
                  id="join-party-b"
                  data-ocid="channel.join_party_b_input"
                  placeholder="Your LXMF hash"
                  value={joinChannelForm.partyB}
                  onChange={(e) =>
                    setJoinChannelForm((f) => ({
                      ...f,
                      partyB: e.target.value,
                    }))
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-amount-b">Amount B (can be 0)</Label>
                <Input
                  id="join-amount-b"
                  data-ocid="channel.join_amount_b_input"
                  type="number"
                  placeholder="0"
                  value={joinChannelForm.amountB}
                  onChange={(e) =>
                    setJoinChannelForm((f) => ({
                      ...f,
                      amountB: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-nonce">Nonce</Label>
                <Input
                  id="join-nonce"
                  data-ocid="channel.join_nonce_input"
                  type="number"
                  placeholder="Current nonce"
                  value={joinChannelForm.nonce}
                  onChange={(e) =>
                    setJoinChannelForm((f) => ({
                      ...f,
                      nonce: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-signature">Signature (hex)</Label>
                <Input
                  id="join-signature"
                  data-ocid="channel.join_signature_input"
                  placeholder="Ed25519 signature"
                  value={joinChannelForm.signature}
                  onChange={(e) =>
                    setJoinChannelForm((f) => ({
                      ...f,
                      signature: e.target.value,
                    }))
                  }
                  className="font-mono"
                />
              </div>
            </div>
            {joinChannelForm.channelId && joinChannelForm.partyB && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium text-foreground">
                  Message to sign:
                </p>
                <code className="block text-xs font-mono text-muted-foreground break-all">
                  {joinChannelForm.channelId}|{joinChannelForm.partyB}|
                  {joinChannelForm.amountB || "0"}|
                  {joinChannelForm.nonce || "0"}
                </code>
              </div>
            )}
            <Button
              data-ocid="channel.join_button"
              onClick={handleJoinChannel}
              disabled={
                joinChannelMutation.isPending ||
                !joinChannelForm.channelId ||
                !joinChannelForm.partyB ||
                !joinChannelForm.signature
              }
              className="gap-2"
            >
              <GitMerge className="h-4 w-4" />
              {joinChannelMutation.isPending ? "Joining..." : "Join Channel"}
            </Button>
          </CardContent>
        </Card>

        {/* Cooperative Close Form */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <XCircle className="h-4 w-4 text-primary" />
              Close Channel (Cooperative)
            </CardTitle>
            <CardDescription>
              Both parties sign the final balance split to close the channel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="close-channel-id">Channel ID</Label>
                <Input
                  id="close-channel-id"
                  data-ocid="channel.close_channel_id_input"
                  placeholder="Channel ID"
                  value={closeChannelForm.channelId}
                  onChange={(e) =>
                    setCloseChannelForm((f) => ({
                      ...f,
                      channelId: e.target.value,
                    }))
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="close-balance-a">Final Balance A</Label>
                <Input
                  id="close-balance-a"
                  data-ocid="channel.close_balance_a_input"
                  type="number"
                  placeholder="Final amount for party A"
                  value={closeChannelForm.finalBalanceA}
                  onChange={(e) =>
                    setCloseChannelForm((f) => ({
                      ...f,
                      finalBalanceA: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="close-balance-b">Final Balance B</Label>
                <Input
                  id="close-balance-b"
                  data-ocid="channel.close_balance_b_input"
                  type="number"
                  placeholder="Final amount for party B"
                  value={closeChannelForm.finalBalanceB}
                  onChange={(e) =>
                    setCloseChannelForm((f) => ({
                      ...f,
                      finalBalanceB: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="close-nonce-a">Nonce A (Party A)</Label>
                <Input
                  id="close-nonce-a"
                  data-ocid="channel.close_nonce_a_input"
                  type="number"
                  placeholder="Party A current nonce"
                  value={closeChannelForm.nonceA}
                  onChange={(e) =>
                    setCloseChannelForm((f) => ({
                      ...f,
                      nonceA: e.target.value,
                    }))
                  }
                />
                {closeChannelDetails?.partyA && (
                  <p className="text-xs text-muted-foreground">
                    Current nonce for{" "}
                    {truncateHash(closeChannelDetails.partyA, 6)}: {nonceA ?? 0}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="close-nonce-b">Nonce B (Party B)</Label>
                <Input
                  id="close-nonce-b"
                  data-ocid="channel.close_nonce_b_input"
                  type="number"
                  placeholder="Party B current nonce"
                  value={closeChannelForm.nonceB}
                  onChange={(e) =>
                    setCloseChannelForm((f) => ({
                      ...f,
                      nonceB: e.target.value,
                    }))
                  }
                />
                {closeChannelDetails?.partyB && (
                  <p className="text-xs text-muted-foreground">
                    Current nonce for{" "}
                    {truncateHash(closeChannelDetails.partyB, 6)}: {nonceB ?? 0}
                  </p>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="close-sig-a">Signature A (hex)</Label>
                <Input
                  id="close-sig-a"
                  data-ocid="channel.close_sig_a_input"
                  placeholder="Party A Ed25519 signature"
                  value={closeChannelForm.sigA}
                  onChange={(e) =>
                    setCloseChannelForm((f) => ({ ...f, sigA: e.target.value }))
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="close-sig-b">Signature B (hex)</Label>
                <Input
                  id="close-sig-b"
                  data-ocid="channel.close_sig_b_input"
                  placeholder="Party B Ed25519 signature"
                  value={closeChannelForm.sigB}
                  onChange={(e) =>
                    setCloseChannelForm((f) => ({ ...f, sigB: e.target.value }))
                  }
                  className="font-mono"
                />
              </div>
            </div>
            {closeChannelForm.channelId &&
              closeChannelForm.finalBalanceA &&
              closeChannelForm.finalBalanceB && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs font-medium text-foreground">
                    Message to sign (both parties):
                  </p>
                  <code className="block text-xs font-mono text-muted-foreground break-all">
                    {closeChannelForm.channelId}|
                    {closeChannelForm.finalBalanceA}|
                    {closeChannelForm.finalBalanceB}|
                    {closeChannelForm.nonceA || "0"}|
                    {closeChannelForm.nonceB || "0"}
                  </code>
                </div>
              )}
            <Button
              data-ocid="channel.close_button"
              onClick={handleCloseChannel}
              disabled={
                closeChannelMutation.isPending ||
                !closeChannelForm.channelId ||
                !closeChannelForm.finalBalanceA ||
                !closeChannelForm.finalBalanceB ||
                !closeChannelForm.sigA ||
                !closeChannelForm.sigB
              }
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              {closeChannelMutation.isPending ? "Closing..." : "Close Channel"}
            </Button>
          </CardContent>
        </Card>

        {/* Channel List */}
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-0">
            {channelsLoading ? (
              <div className="p-6 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : channels && channels.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Party A</TableHead>
                      <TableHead>Party B</TableHead>
                      <TableHead>Locked A</TableHead>
                      <TableHead>Locked B</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channels.map((ch, idx) => (
                      <TableRow
                        key={`channel-${ch.id}`}
                        data-ocid={`channel.item.${idx + 1}`}
                      >
                        <TableCell className="font-mono text-xs">
                          {truncateHash(ch.id, 6)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {truncateHash(ch.partyA, 6)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {truncateHash(ch.partyB, 6)}
                        </TableCell>
                        <TableCell>{formatBalance(ch.lockedA)}</TableCell>
                        <TableCell>{formatBalance(ch.lockedB)}</TableCell>
                        <TableCell>{channelStatusBadge(ch.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                data-ocid="channel.empty_state"
              >
                <ArrowLeftRight className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No channels found for this address.</p>
                <p className="text-xs">Open a channel above to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* HTLC List */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          HTLCs
        </h2>
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-0">
            {htlcsLoading ? (
              <div className="p-6 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : htlcs && htlcs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Sender</TableHead>
                      <TableHead>Receiver</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {htlcs.map((htlc, idx) => (
                      <TableRow
                        key={`htlc-${htlc.id}`}
                        data-ocid={`htlc.item.${idx + 1}`}
                      >
                        <TableCell className="font-mono text-xs">
                          {truncateHash(htlc.id, 6)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {truncateHash(htlc.senderLxmfHash, 6)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {truncateHash(htlc.receiverLxmfHash, 6)}
                        </TableCell>
                        <TableCell>{formatBalance(htlc.amount)}</TableCell>
                        <TableCell>{statusBadge(htlc.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(
                            Number(htlc.expiry) / 1_000_000,
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {htlc.status === HtlcStatus.Locked && (
                            <div className="flex items-center gap-2 justify-end">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    data-ocid={`htlc.release_button.${idx + 1}`}
                                    size="sm"
                                    variant="outline"
                                    className="gap-1"
                                  >
                                    <Unlock className="h-3 w-3" />
                                    Release
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Release HTLC</DialogTitle>
                                    <DialogDescription>
                                      Enter the preimage to release funds to the
                                      receiver.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-2 py-4">
                                    <Label htmlFor={`preimage-${htlc.id}`}>
                                      Preimage
                                    </Label>
                                    <Input
                                      id={`preimage-${htlc.id}`}
                                      data-ocid={`htlc.preimage_input.${idx + 1}`}
                                      placeholder="Enter preimage..."
                                      value={preimageMap[htlc.id] || ""}
                                      onChange={(e) =>
                                        setPreimageMap((m) => ({
                                          ...m,
                                          [htlc.id]: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      data-ocid={`htlc.confirm_release_button.${idx + 1}`}
                                      onClick={() => handleRelease(htlc.id)}
                                      disabled={
                                        releaseMutation.isPending ||
                                        !preimageMap[htlc.id]
                                      }
                                    >
                                      {releaseMutation.isPending
                                        ? "Releasing..."
                                        : "Confirm Release"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Button
                                data-ocid={`htlc.refund_button.${idx + 1}`}
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRefund(htlc.id)}
                                disabled={refundMutation.isPending}
                              >
                                <RefreshCw className="h-3 w-3" />
                                Refund
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                data-ocid="htlc.empty_state"
              >
                <Lock className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No HTLCs found for this address.</p>
                <p className="text-xs">Create one above to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Event Log */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Event Log
        </h2>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            {eventsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : events && events.length > 0 ? (
              <ScrollArea className="h-64 rounded-md border bg-muted/20 p-3">
                <div className="space-y-2">
                  {events
                    .slice()
                    .reverse()
                    .map((event, idx) => (
                      <div
                        key={`event-${event.slice(0, 20)}`}
                        data-ocid={`event.item.${idx + 1}`}
                        className="text-xs font-mono text-muted-foreground border-l-2 border-primary/30 pl-3 py-1"
                      >
                        {event}
                      </div>
                    ))}
                </div>
              </ScrollArea>
            ) : (
              <div
                className="flex flex-col items-center justify-center py-8 text-muted-foreground"
                data-ocid="event.empty_state"
              >
                <Activity className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No events yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
