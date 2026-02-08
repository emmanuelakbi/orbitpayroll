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

const statusVariants: Record<
  PayrollRun["status"],
  "success" | "warning" | "destructive"
> = {
  EXECUTED: "success",
  PENDING: "warning",
  FAILED: "destructive",
};

const statusLabels: Record<PayrollRun["status"], string> = {
  EXECUTED: "Executed",
  PENDING: "Pending",
  FAILED: "Failed",
};

/**
 * Accessible Payroll History Table component.
 *
 * WCAG 2.1 AA Compliance:
 * - Proper table semantics with scope attributes
 * - Action buttons have accessible labels
 * - Status badges use text, not just color
 * - External links indicate they open in new window
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.5
 */
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
    <Table aria-label="Payroll history">
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Date</TableHead>
          <TableHead scope="col">Total MNEE</TableHead>
          <TableHead scope="col">Contractors</TableHead>
          <TableHead scope="col">Status</TableHead>
          <TableHead scope="col">Transaction</TableHead>
          <TableHead scope="col" className="w-[100px]">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id}>
            <TableCell className="font-medium">
              {run.executedAt ? formatDate(run.executedAt) : "Pending"}
            </TableCell>
            <TableCell>{formatMnee(run.totalMnee)} MNEE</TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Users
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <span aria-label={`${run.contractorCount} contractors`}>
                  {run.contractorCount}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <Badge
                variant={statusVariants[run.status]}
                aria-label={`Status: ${statusLabels[run.status]}`}
              >
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
                  aria-label={`View transaction ${formatAddress(
                    run.txHash,
                  )} on block explorer (opens in new tab)`}
                >
                  <span className="font-mono">{formatAddress(run.txHash)}</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : (
                <span
                  className="text-muted-foreground text-sm"
                  aria-label="No transaction"
                >
                  —
                </span>
              )}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(run)}
                aria-label={`View details for payroll run on ${
                  run.executedAt ? formatDate(run.executedAt) : "pending"
                }`}
              >
                <Eye className="h-4 w-4 mr-1" aria-hidden="true" />
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

/**
 * Mobile card layout for responsive design.
 *
 * WCAG 2.1 AA Compliance:
 * - Proper heading structure
 * - Action buttons have accessible labels
 * - Touch targets meet 44px minimum
 * - External links indicate they open in new window
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 8.1, 8.3
 */
export function PayrollHistoryCard({
  run,
  onViewDetails,
}: {
  run: PayrollRun;
  onViewDetails: (run: PayrollRun) => void;
}) {
  return (
    <article
      className="p-4 border rounded-lg space-y-3"
      aria-label={`Payroll run on ${
        run.executedAt ? formatDate(run.executedAt) : "pending"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">
            {run.executedAt ? formatDate(run.executedAt) : "Pending"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {run.contractorCount} contractor
            {run.contractorCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Badge
          variant={statusVariants[run.status]}
          aria-label={`Status: ${statusLabels[run.status]}`}
        >
          {statusLabels[run.status]}
        </Badge>
      </div>
      <dl>
        <div className="flex items-center justify-between text-sm min-h-[44px]">
          <dt className="text-muted-foreground">Total</dt>
          <dd className="font-medium">{formatMnee(run.totalMnee)} MNEE</dd>
        </div>
      </dl>
      {run.txHash && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Transaction</span>
          <a
            href={getExplorerUrl(run.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 min-h-[44px] py-2"
            aria-label={`View transaction ${formatAddress(
              run.txHash,
            )} on block explorer (opens in new tab)`}
          >
            <span className="font-mono">{formatAddress(run.txHash)}</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      )}
      <div className="pt-2 border-t">
        <Button
          variant="outline"
          size="default"
          className="w-full min-h-[44px]"
          onClick={() => onViewDetails(run)}
          aria-label={`View details for payroll run on ${
            run.executedAt ? formatDate(run.executedAt) : "pending"
          }`}
        >
          <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
          View Details
        </Button>
      </div>
    </article>
  );
}
