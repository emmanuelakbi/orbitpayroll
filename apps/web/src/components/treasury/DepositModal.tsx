"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TransactionStatusModal,
  type TransactionStatus,
} from "./TransactionStatusModal";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { Loader2 } from "lucide-react";

// ERC20 ABI for approval and balance
const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Treasury ABI for deposit
const TREASURY_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// MNEE token address (mainnet)
const MNEE_ADDRESS = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFB6cF" as `0x${string}`;

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treasuryAddress: string;
  onSuccess?: () => void;
}

type DepositStep = "input" | "approve" | "deposit";

export function DepositModal({
  open,
  onOpenChange,
  treasuryAddress,
  onSuccess,
}: DepositModalProps) {
  const { address } = useAccount();
  const [amount, setAmount] = React.useState("");
  const [step, setStep] = React.useState<DepositStep>("input");
  const [txStatus, setTxStatus] = React.useState<TransactionStatus>({
    status: "idle",
  });
  const [showTxModal, setShowTxModal] = React.useState(false);

  // Read user's MNEE balance
  const { data: userBalance } = useReadContract({
    address: MNEE_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && open,
    },
  });

  // Read current allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: MNEE_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && treasuryAddress ? [address, treasuryAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!treasuryAddress && open,
    },
  });

  // Write contract hooks
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    reset: resetApprove,
  } = useWriteContract();

  const {
    writeContract: writeDeposit,
    data: depositHash,
    isPending: isDepositPending,
    reset: resetDeposit,
  } = useWriteContract();

  // Wait for approval transaction
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    });

  // Wait for deposit transaction
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({
      hash: depositHash,
    });

  // Parse amount to bigint
  const parsedAmount = React.useMemo(() => {
    try {
      if (!amount || isNaN(Number(amount))) return BigInt(0);
      return parseUnits(amount, 18);
    } catch {
      return BigInt(0);
    }
  }, [amount]);

  // Check if approval is needed
  const needsApproval = React.useMemo(() => {
    if (!currentAllowance || parsedAmount === BigInt(0)) return true;
    return currentAllowance < parsedAmount;
  }, [currentAllowance, parsedAmount]);

  // Format user balance for display
  const formattedBalance = React.useMemo(() => {
    if (!userBalance) return "0.00";
    return Number(formatUnits(userBalance, 18)).toFixed(2);
  }, [userBalance]);

  // Validation
  const isValidAmount =
    parsedAmount > BigInt(0) && (!userBalance || parsedAmount <= userBalance);
  const hasInsufficientBalance = userBalance && parsedAmount > userBalance;

  // Handle approval
  const handleApprove = React.useCallback(() => {
    if (!treasuryAddress || parsedAmount === BigInt(0)) return;

    setShowTxModal(true);
    setTxStatus({ status: "pending", message: "Requesting approval..." });
    setStep("approve");

    writeApprove(
      {
        address: MNEE_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [treasuryAddress as `0x${string}`, parsedAmount],
      },
      {
        onError: (error) => {
          setTxStatus({
            status: "error",
            error: error.message || "Approval failed",
          });
        },
      }
    );
  }, [treasuryAddress, parsedAmount, writeApprove]);

  // Handle deposit
  const handleDeposit = React.useCallback(() => {
    if (!treasuryAddress || parsedAmount === BigInt(0)) return;

    setShowTxModal(true);
    setTxStatus({ status: "pending", message: "Requesting deposit..." });
    setStep("deposit");

    writeDeposit(
      {
        address: treasuryAddress as `0x${string}`,
        abi: TREASURY_ABI,
        functionName: "deposit",
        args: [parsedAmount],
      },
      {
        onError: (error) => {
          setTxStatus({
            status: "error",
            error: error.message || "Deposit failed",
          });
        },
      }
    );
  }, [treasuryAddress, parsedAmount, writeDeposit]);

  // Update tx status based on approval state
  React.useEffect(() => {
    if (step === "approve") {
      if (approveHash && isApproveConfirming) {
        setTxStatus({ status: "confirming", txHash: approveHash });
      }
      if (isApproveSuccess && approveHash) {
        setTxStatus({ status: "success", txHash: approveHash });
        refetchAllowance();
      }
    }
  }, [step, approveHash, isApproveConfirming, isApproveSuccess, refetchAllowance]);

  // Update tx status based on deposit state
  React.useEffect(() => {
    if (step === "deposit") {
      if (depositHash && isDepositConfirming) {
        setTxStatus({ status: "confirming", txHash: depositHash });
      }
      if (isDepositSuccess && depositHash) {
        setTxStatus({ status: "success", txHash: depositHash });
      }
    }
  }, [step, depositHash, isDepositConfirming, isDepositSuccess]);

  // Handle transaction modal close
  const handleTxModalClose = React.useCallback(() => {
    setShowTxModal(false);

    if (txStatus.status === "success") {
      if (step === "approve") {
        // After approval success, proceed to deposit
        setStep("input");
        resetApprove();
        setTxStatus({ status: "idle" });
      } else if (step === "deposit") {
        // After deposit success, close everything
        setAmount("");
        setStep("input");
        resetDeposit();
        setTxStatus({ status: "idle" });
        onOpenChange(false);
        onSuccess?.();
      }
    } else if (txStatus.status === "error") {
      // Reset on error
      setStep("input");
      resetApprove();
      resetDeposit();
      setTxStatus({ status: "idle" });
    }
  }, [txStatus.status, step, resetApprove, resetDeposit, onOpenChange, onSuccess]);

  // Handle max button
  const handleMax = React.useCallback(() => {
    if (userBalance) {
      setAmount(formatUnits(userBalance, 18));
    }
  }, [userBalance]);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setAmount("");
      setStep("input");
      setTxStatus({ status: "idle" });
      resetApprove();
      resetDeposit();
    }
  }, [open, resetApprove, resetDeposit]);

  const isProcessing = isApprovePending || isDepositPending;

  return (
    <>
      <Dialog open={open && !showTxModal} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deposit MNEE</DialogTitle>
            <DialogDescription>
              Deposit MNEE tokens into your organization&apos;s treasury
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Amount</Label>
                <span className="text-xs text-muted-foreground">
                  Balance: {formattedBalance} MNEE
                </span>
              </div>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-16"
                  min="0"
                  step="0.01"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 px-2 text-xs"
                  onClick={handleMax}
                >
                  MAX
                </Button>
              </div>
              {hasInsufficientBalance && (
                <p className="text-sm text-destructive">Insufficient balance</p>
              )}
            </div>

            {/* Approval Status */}
            {isValidAmount && needsApproval && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="text-muted-foreground">
                  You need to approve the treasury contract to spend your MNEE
                  tokens before depositing.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {needsApproval ? (
              <Button
                onClick={handleApprove}
                disabled={!isValidAmount || isProcessing}
              >
                {isProcessing && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Approve MNEE
              </Button>
            ) : (
              <Button
                onClick={handleDeposit}
                disabled={!isValidAmount || isProcessing}
              >
                {isProcessing && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Deposit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Status Modal */}
      <TransactionStatusModal
        open={showTxModal}
        onOpenChange={setShowTxModal}
        transactionStatus={txStatus}
        onClose={handleTxModalClose}
      />
    </>
  );
}
