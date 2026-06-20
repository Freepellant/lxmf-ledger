import { HtlcStatus } from "@/backend";
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
  useDeposit,
  useEventLog,
  useGetBalance,
  useListHTLCs,
  useLockHTLC,
  useRefundHTLC,
  useReleaseHTLC,
} from "@/hooks/useQueries";
import {
  Activity,
  Coins,
  Droplets,
  Lock,
  RefreshCw,
  Unlock,
  Wallet,
} from "lucide-react";
import { useState } from "react";

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
  const { data: events, isLoading: eventsLoading } = useEventLog();

  const depositMutation = useDeposit();
  const lockMutation = useLockHTLC();
  const releaseMutation = useReleaseHTLC();
  const refundMutation = useRefundHTLC();

  const [lockForm, setLockForm] = useState({
    sender: "",
    receiver: "",
    amount: "",
    paymentHash: "",
    expiry: "300",
  });

  const handleDeposit = () => {
    if (!lxmfHash || !depositAmount) return;
    depositMutation.mutate({ lxmfHash, amount: BigInt(depositAmount) });
  };

  const handleLock = () => {
    if (
      !lockForm.sender ||
      !lockForm.receiver ||
      !lockForm.amount ||
      !lockForm.paymentHash
    )
      return;
    lockMutation.mutate({
      senderLxmfHash: lockForm.sender,
      receiverLxmfHash: lockForm.receiver,
      amount: BigInt(lockForm.amount),
      paymentHash: lockForm.paymentHash,
      expirySeconds: BigInt(lockForm.expiry),
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
                <Coins className="h-4 w-4" />
                Total HTLC Volume
              </CardDescription>
              <CardTitle className="text-3xl font-display">
                {htlcsLoading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  `${formatBalance(htlcs?.reduce((sum, h) => sum + h.amount, 0n) ?? 0n)}`
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                All time locked value
              </p>
            </CardContent>
          </Card>
        </div>
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
            <Button
              data-ocid="htlc.lock_button"
              onClick={handleLock}
              disabled={
                lockMutation.isPending ||
                !lockForm.sender ||
                !lockForm.receiver ||
                !lockForm.amount ||
                !lockForm.paymentHash
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
