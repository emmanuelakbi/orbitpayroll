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
import type { Contractor } from "@/lib/api/types";
import { AlertTriangle, Loader2 } from "lucide-react";
import { formatAddress } from "@/lib/auth";

interface ArchiveContractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractor: Contractor | null;
  onConfirm: () => Promise<void>;
  isArchiving: boolean;
}

export function ArchiveContractorModal({
  isOpen,
  onClose,
  contractor,
  onConfirm,
  isArchiving,
}: ArchiveContractorModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  if (!contractor) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Archive Contractor</DialogTitle>
              <DialogDescription>
                This action cannot be easily undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Are you sure you want to archive this contractor? They will no longer
            be included in payroll runs.
          </p>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{contractor.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Wallet</span>
              <span className="font-mono">{formatAddress(contractor.walletAddress)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isArchiving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isArchiving}
          >
            {isArchiving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Archive Contractor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
