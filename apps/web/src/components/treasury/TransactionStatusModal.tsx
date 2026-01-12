"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getExplorerUrl } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";

export type TransactionStatus =
  | { status: "idle" }
  | { status: "pending"; message: string }
  | { status: "confirming"; txHash: string }
  | { status: "success"; txHash: string }
  | { status: "error"; error: string };

interface TransactionStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionStatus: TransactionStatus;
  onClose?: () => void;
}

export function TransactionStatusModal({
  open,
  onOpenChange,
  transactionStatus,
  onClose,
}: TransactionStatusModalProps) {
  const handleClose = React.useCallback(() => {
    onOpenChange(false);
    onClose?.();
  }, [onOpenChange, onClose]);

  // Don't allow closing while pending or confirming
  const canClose =
    transactionStatus.status === "success" ||
    transactionStatus.status === "error" ||
    transactionStatus.status === "idle";

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen && canClose) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {transactionStatus.status === "pending" && "Processing Transaction"}
            {transactionStatus.status === "confirming" && "Confirming Transaction"}
            {transactionStatus.status === "success" && "Transaction Successful"}
            {transactionStatus.status === "error" && "Transaction Failed"}
            {transactionStatus.status === "idle" && "Transaction"}
          </DialogTitle>
          <DialogDescription>
            {transactionStatus.status === "pending" &&
              "Please confirm the transaction in your wallet"}
            {transactionStatus.status === "confirming" &&
              "Waiting for blockchain confirmation"}
            {transactionStatus.status === "success" &&
              "Your transaction has been confirmed"}
            {transactionStatus.status === "error" &&
              "Something went wrong with your transaction"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-6 space-y-4">
          {/* Status Icon */}
          {transactionStatus.status === "pending" && (
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground text-center">
                {transactionStatus.message}
              </p>
            </div>
          )}

          {transactionStatus.status === "confirming" && (
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground text-center">
                Transaction submitted. Waiting for confirmation...
              </p>
              <a
                href={getExplorerUrl(transactionStatus.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View on Etherscan
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {transactionStatus.status === "success" && (
            <div className="flex flex-col items-center space-y-2">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-sm text-muted-foreground text-center">
                Transaction confirmed successfully!
              </p>
              <a
                href={getExplorerUrl(transactionStatus.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View on Etherscan
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {transactionStatus.status === "error" && (
            <div className="flex flex-col items-center space-y-2">
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-sm text-destructive text-center">
                {transactionStatus.error}
              </p>
            </div>
          )}
        </div>

        {/* Close Button */}
        {canClose && (
          <div className="flex justify-end">
            <Button onClick={handleClose}>
              {transactionStatus.status === "success" ? "Done" : "Close"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
