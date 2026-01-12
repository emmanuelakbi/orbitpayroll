"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAddress } from "@/lib/auth";
import { formatMnee, formatDate, getExplorerUrl } from "@/lib/utils";
import type { PayrollRunDetail } from "@/lib/api/types";
import { ExternalLink, Download, Copy, Check } from "lucide-react";

interface PayrollRunDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runDetail: PayrollRunDetail | null;
  isLoading: boolean;
  onExportCsv: () => void;
}

const statusVariants: Record<string, "success" | "warning" | "destructive"> = {
  CONFIRMED: "success",
  PENDING: "warning",
  FAILED: "destructive",
};

const statusLabels: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
  FAILED: "Failed",
};

export function PayrollRunDetailModal({
  open,
  onOpenChange,
  runDetail,
  isLoading,
  onExportCsv,
}: PayrollRunDetailModalProps) {
  const [copiedTxHash, setCopiedTxHash] = React.useState(false);

  const handleCopyTxHash = React.useCallback(async () => {
    if (runDetail?.txHash) {
      await navigator.clipboard.writeText(runDetail.txHash);
      setCopiedTxHash(true);
      setTimeout(() => setCopiedTxHash(false), 2000);
    }
  }, [runDetail?.txHash]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payroll Run Details</DialogTitle>
          <DialogDescription>
            {runDetail
              ? `Executed on ${formatDate(runDetail.executedAt)}`
              : "Loading details..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <PayrollRunDetailSkeleton />
        ) : runDetail ? (
          <div className="space-y-6">
            {/* Summary Section */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-lg font-semibold">
                  {formatMnee(runDetail.totalAmount)} MNEE
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={statusVariants[runDetail.status]} className="mt-1">
                  {statusLabels[runDetail.status]}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contractors Paid</p>
                <p className="text-lg font-semibold">{runDetail.contractorCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="text-sm font-medium">
                  {formatDate(runDetail.executedAt)}
                </p>
              </div>
            </div>

            {/* Transaction Hash */}
            {runDetail.txHash && (
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Transaction Hash
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-muted px-2 py-1 rounded truncate">
                    {runDetail.txHash}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyTxHash}
                    title="Copy transaction hash"
                  >
                    {copiedTxHash ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <a
                      href={getExplorerUrl(runDetail.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View on Etherscan"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* Payments Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Contractor Payments</h3>
                <Button variant="outline" size="sm" onClick={onExportCsv}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
              
              {/* Desktop Table */}
              <div className="hidden sm:block border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contractor</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runDetail.payments.map((payment, index) => (
                      <TableRow key={`${payment.contractorId}-${index}`}>
                        <TableCell className="font-medium">
                          {payment.contractorName}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatAddress(payment.walletAddress)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMnee(payment.amount)} MNEE
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {runDetail.payments.map((payment, index) => (
                  <div
                    key={`${payment.contractorId}-${index}`}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{payment.contractorName}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {formatAddress(payment.walletAddress)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium">
                        {formatMnee(payment.amount)} MNEE
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No details available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PayrollRunDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary skeleton */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>

      {/* Transaction hash skeleton */}
      <div className="p-4 border rounded-lg">
        <Skeleton className="h-4 w-28 mb-2" />
        <Skeleton className="h-8 w-full" />
      </div>

      {/* Table skeleton */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="border rounded-lg p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
