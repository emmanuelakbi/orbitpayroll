"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { formatUnits, encodeFunctionData } from "viem";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PayrollPreview, CreatePayrollRunRequest } from "@/lib/api/types";
import type { TransactionStatus } from "@/components/treasury/TransactionStatusModal";

// PayrollTreasury ABI for runPayroll
const PAYROLL_TREASURY_ABI = [
  {
    inputs: [
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "offchainRunId", type: "bytes32" },
    ],
    name: "runPayroll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

interface PayrollExecutionContextValue {
  // State
  transactionStatus: TransactionStatus;
  showTxModal: boolean;
  gasEstimate: string | null;
  isEstimatingGas: boolean;
  isExecuting: boolean;

  // Actions
  executePayroll: (
    preview: PayrollPreview,
    treasuryAddress: string,
    orgId: string,
  ) => void;
  estimateGas: (preview: PayrollPreview, treasuryAddress: string) => void;
  closeTxModal: () => void;
  reset: () => void;
}

const PayrollExecutionContext =
  React.createContext<PayrollExecutionContextValue | null>(null);

export function usePayrollExecution() {
  const context = React.useContext(PayrollExecutionContext);
  if (!context) {
    throw new Error(
      "usePayrollExecution must be used within PayrollExecutionProvider",
    );
  }
  return context;
}

interface PayrollExecutionProviderProps {
  children: React.ReactNode;
}

export function PayrollExecutionProvider({
  children,
}: PayrollExecutionProviderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const [transactionStatus, setTransactionStatus] =
    React.useState<TransactionStatus>({
      status: "idle",
    });
  const [showTxModal, setShowTxModal] = React.useState(false);
  const [gasEstimate, setGasEstimate] = React.useState<string | null>(null);
  const [isEstimatingGas, setIsEstimatingGas] = React.useState(false);
  const [pendingOrgId, setPendingOrgId] = React.useState<string | null>(null);
  const [pendingPreview, setPendingPreview] =
    React.useState<PayrollPreview | null>(null);

  // Write contract hook
  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    reset: resetWrite,
  } = useWriteContract();

  // Wait for transaction receipt
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isTxError,
    error: txError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Mutation to record payroll run in backend
  const recordPayrollMutation = useMutation({
    mutationFn: async ({
      orgId,
      data,
    }: {
      orgId: string;
      data: CreatePayrollRunRequest;
    }) => {
      return api.payroll.create(orgId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-preview"] });
      queryClient.invalidateQueries({ queryKey: ["treasury"] });
    },
  });

  // Generate a unique run ID
  const generateRunId = React.useCallback(() => {
    const timestamp = Date.now().toString(16);
    const random = Math.random().toString(16).slice(2, 10);
    const combined = `${timestamp}${random}`.padEnd(64, "0");
    return `0x${combined}` as `0x${string}`;
  }, []);

  // Estimate gas for the transaction
  const estimateGas = React.useCallback(
    async (preview: PayrollPreview, _treasuryAddress: string) => {
      if (!address || !preview.contractors.length) {
        setGasEstimate(null);
        return;
      }

      setIsEstimatingGas(true);
      try {
        const recipients = preview.contractors.map(
          (c) => c.walletAddress as `0x${string}`,
        );
        const amounts = preview.contractors.map((c) => BigInt(c.amount));
        const runId = generateRunId();

        // Encode the function call (used for gas estimation reference)
        encodeFunctionData({
          abi: PAYROLL_TREASURY_ABI,
          functionName: "runPayroll",
          args: [recipients, amounts, runId],
        });

        // For now, provide a rough estimate since we can't call useEstimateGas conditionally
        // In production, you'd want to use the actual gas estimation
        const estimatedGas = BigInt(
          100000 + preview.contractors.length * 50000,
        );
        const gasPrice = BigInt(20000000000); // 20 gwei estimate
        const totalCost = estimatedGas * gasPrice;

        setGasEstimate(`~${formatUnits(totalCost, 18)} ETH`);
      } catch (error) {
        console.error("Gas estimation failed:", error);
        setGasEstimate("Unable to estimate");
      } finally {
        setIsEstimatingGas(false);
      }
    },
    [address, generateRunId],
  );

  // Execute payroll
  const executePayroll = React.useCallback(
    (preview: PayrollPreview, treasuryAddress: string, orgId: string) => {
      if (!preview.contractors.length || !preview.isSufficient) {
        return;
      }

      setPendingOrgId(orgId);
      setPendingPreview(preview);
      setShowTxModal(true);
      setTransactionStatus({
        status: "pending",
        message: "Requesting signature...",
      });

      const recipients = preview.contractors.map(
        (c) => c.walletAddress as `0x${string}`,
      );
      const amounts = preview.contractors.map((c) => BigInt(c.amount));
      const runId = generateRunId();

      writeContract(
        {
          address: treasuryAddress as `0x${string}`,
          abi: PAYROLL_TREASURY_ABI,
          functionName: "runPayroll",
          args: [recipients, amounts, runId],
        },
        {
          onError: (error) => {
            setTransactionStatus({
              status: "error",
              error: error.message || "Transaction failed",
            });
          },
        },
      );
    },
    [generateRunId, writeContract],
  );

  // Update transaction status based on tx state
  React.useEffect(() => {
    if (txHash && isConfirming) {
      setTransactionStatus({ status: "confirming", txHash });
    }
  }, [txHash, isConfirming]);

  // Handle transaction confirmation
  React.useEffect(() => {
    if (isConfirmed && txHash && pendingOrgId && pendingPreview) {
      // Record the payroll run in the backend
      const items = pendingPreview.contractors.map((c) => ({
        contractorId: c.id,
        amountMnee: c.amount,
      }));

      recordPayrollMutation.mutate(
        {
          orgId: pendingOrgId,
          data: {
            txHash,
            items,
          },
        },
        {
          onSuccess: () => {
            setTransactionStatus({ status: "success", txHash });
          },
          onError: (error) => {
            // Transaction succeeded but backend recording failed
            // Still show success since the on-chain tx went through
            console.error("Failed to record payroll run:", error);
            setTransactionStatus({ status: "success", txHash });
          },
        },
      );
    }
  }, [
    isConfirmed,
    txHash,
    pendingOrgId,
    pendingPreview,
    recordPayrollMutation,
  ]);

  // Handle transaction error
  React.useEffect(() => {
    if (isTxError && txError) {
      setTransactionStatus({
        status: "error",
        error: txError.message || "Transaction failed on-chain",
      });
    }
  }, [isTxError, txError]);

  // Close transaction modal
  const closeTxModal = React.useCallback(() => {
    setShowTxModal(false);

    if (transactionStatus.status === "success") {
      // Navigate to history page after successful payroll
      router.push("/dashboard/history");
    }
  }, [transactionStatus.status, router]);

  // Reset state
  const reset = React.useCallback(() => {
    setTransactionStatus({ status: "idle" });
    setShowTxModal(false);
    setGasEstimate(null);
    setPendingOrgId(null);
    setPendingPreview(null);
    resetWrite();
  }, [resetWrite]);

  const value: PayrollExecutionContextValue = {
    transactionStatus,
    showTxModal,
    gasEstimate,
    isEstimatingGas,
    isExecuting: isWritePending || isConfirming,
    executePayroll,
    estimateGas,
    closeTxModal,
    reset,
  };

  return (
    <PayrollExecutionContext.Provider value={value}>
      {children}
    </PayrollExecutionContext.Provider>
  );
}
