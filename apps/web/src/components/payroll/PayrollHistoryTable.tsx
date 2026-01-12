"use client";

import * as React from "react";
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
import type { PayrollRun } from "@/lib/api/types";
import { ExternalLink, Eye, Users } from "lucide-react";

interface PayrollHistoryTableProps {
  runs: PayrollRun[];
  isLoading: boolean;
  onViewDetails: (run: PayrollRun) => void;
}

const statusVariants: Record<PayrollRun["status"], "success" | "warning" | "destructive"> = {
  CONFIRMED: "success",
  PENDING: "warning",
  FAILED: "destructive",
};

const statusLabels: Record<PayrollRun["status"], string> = {
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
  FAILED: "Failed",
};

export function PayrollHistoryTable({
  runs,
  isLoading,
  onViewDetails,
}: PayrollHistoryTableProps) {
  if (isLoading) {
    return <PayrollHistoryTableSkeleton />;
  }

  if (runs.length === 0) {
    return null;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Total MNEE</TableHead>
          <TableHead>Contractors</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Transaction</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id}>
            <TableCell className="font-medium">
              {formatDate(run.executedAt)}
            </TableCell>
            <TableCell>{formatMnee(run.totalAmount)} MNEE</TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                {run.contractorCount}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={statusVariants[run.status]}>
                {statusLabels[run.status]}
              </Badge>
            </TableCell>
            <TableCell>
              {run.txHash ? (
                <a
                  href={getExplorerUrl(run.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <span className="font-mono">{formatAddress(run.txHash)}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(run)}
                title="View details"
              >
                <Eye className="h-4 w-4 mr-1" />
                Details
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PayrollHistoryTableSkeleton() {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b items-center">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

// Mobile card layout for responsive design
export function PayrollHistoryCard({
  run,
  onViewDetails,
}: {
  run: PayrollRun;
  onViewDetails: (run: PayrollRun) => void;
}) {
  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{formatDate(run.executedAt)}</p>
          <p className="text-sm text-muted-foreground">
            {run.contractorCount} contractor{run.contractorCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Badge variant={statusVariants[run.status]}>
          {statusLabels[run.status]}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-sm min-h-[44px]">
        <span className="text-muted-foreground">Total</span>
        <span className="font-medium">{formatMnee(run.totalAmount)} MNEE</span>
      </div>
      {run.txHash && (
        <div className="flex items-center justify-between text-sm min-h-[44px]">
          <span className="text-muted-foreground">Transaction</span>
          <a
            href={getExplorerUrl(run.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 min-h-[44px] py-2"
          >
            <span className="font-mono">{formatAddress(run.txHash)}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
      <div className="pt-2 border-t">
        <Button
          variant="outline"
          size="default"
          className="w-full min-h-[44px]"
          onClick={() => onViewDetails(run)}
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </div>
    </div>
  );
}
