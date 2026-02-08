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
import { formatMnee } from "@/lib/utils";
import { AlertTriangle, Loader2, Fuel } from "lucide-react";
import type { PayrollPreview } from "@/lib/api/types";

interface PayrollConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: PayrollPreview;
  gasEstimate: string | null;
  isEstimatingGas: boolean;
  onConfirm: () => void;
  isExecuting: boolean;
}

export function PayrollConfirmModal({
  open,
  onOpenChange,
  preview,
  gasEstimate,
  isEstimatingGas,
  onConfirm,
  isExecuting,
}: PayrollConfirmModalProps) {
  const canConfirm = preview.isSufficient && !isExecuting && !isEstimatingGas;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirm Payroll Execution
          </DialogTitle>
          <DialogDescription>
            Please review the details before executing payroll. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-semibold">
                {formatMnee(preview.totalMnee)} MNEE
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipients:</span>
              <span className="font-semibold">
                {preview.contractors.length} contractor
                {preview.contractors.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Treasury Balance:</span>
              <span className="font-semibold">
                {formatMnee(preview.treasuryBalance)} MNEE
              </span>
            </div>
          </div>

          {/* Gas Estimate */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Estimated Gas:
            </span>
            {isEstimatingGas ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="text-sm font-medium">
                {gasEstimate || "Unable to estimate"}
              </span>
            )}
          </div>

          {/* Warning */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              By confirming, you will sign a blockchain transaction that
              transfers MNEE tokens to all listed contractors. Make sure all
              wallet addresses are correct.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExecuting}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!canConfirm}>
            {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isExecuting ? "Executing..." : "Confirm & Execute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
