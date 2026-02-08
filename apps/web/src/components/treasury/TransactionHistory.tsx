"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMnee, formatDate, getExplorerUrl } from "@/lib/utils";
import { formatAddress } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  History,
  ExternalLink,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";

interface TransactionHistoryProps {
  orgId: string;
  treasuryAddress: string;
}

interface TransactionEvent {
  id: string;
  type: "deposit" | "payout";
  amount: string;
  txHash: string;
  timestamp: string;
  from?: string;
  to?: string;
}

/**
 * Accessible Transaction History component.
 *
 * WCAG 2.1 AA Compliance:
 * - Proper heading structure
 * - External links indicate they open in new window
 * - Touch targets meet 44px minimum on mobile
 *
 * Responsive Design:
 * - Stacks content on mobile
 * - Touch-friendly spacing
 *
 * Validates: Requirements 7.1, 7.3, 8.1, 8.3
 */
export function TransactionHistory({ orgId }: TransactionHistoryProps) {
  // Fetch payroll runs as transaction history
  const {
    data: payrollRuns,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["payroll-runs", orgId, { limit: 10 }],
    queryFn: () => api.payroll.list(orgId, { limit: 10 }),
    enabled: !!orgId,
    staleTime: 60 * 1000, // 1 minute - transaction history is relatively static
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  // Transform payroll runs into transaction events
  const transactions: TransactionEvent[] = React.useMemo(() => {
    if (!payrollRuns?.data) return [];

    return payrollRuns.data
      .filter((run) => run.txHash && run.status === "EXECUTED")
      .map((run) => ({
        id: run.id,
        type: "payout" as const,
        amount: run.totalMnee,
        txHash: run.txHash!,
        timestamp: run.executedAt ?? run.createdAt,
      }));
  }, [payrollRuns]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" aria-hidden="true" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="space-y-4"
            role="status"
            aria-label="Loading transaction history"
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" aria-hidden="true" />
                  <Skeleton className="h-3 w-32" aria-hidden="true" />
                </div>
                <Skeleton className="h-4 w-20" aria-hidden="true" />
              </div>
            ))}
            <span className="sr-only">Loading transaction history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" aria-hidden="true" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground" role="alert">
            Failed to load transaction history
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" aria-hidden="true" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <History
              className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Deposit MNEE or run payroll to see transactions here
            </p>
          </div>
        ) : (
          <ul className="space-y-4" aria-label="Transaction list">
            {transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex flex-col gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full flex-shrink-0 ${
                      tx.type === "deposit"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-blue-500/10 text-blue-500"
                    }`}
                    aria-hidden="true"
                  >
                    {tx.type === "deposit" ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {tx.type === "deposit" ? "Deposit" : "Payroll Payout"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(tx.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <p
                      className={`font-medium text-sm ${
                        tx.type === "deposit" ? "text-green-500" : ""
                      }`}
                      aria-label={`${
                        tx.type === "deposit" ? "Received" : "Sent"
                      } ${formatMnee(tx.amount)} MNEE`}
                    >
                      {tx.type === "deposit" ? "+" : "-"}
                      {formatMnee(tx.amount)} MNEE
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      <span className="sr-only">Transaction hash: </span>
                      {formatAddress(tx.txHash)}
                    </p>
                  </div>
                  <a
                    href={getExplorerUrl(tx.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-background rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
                    aria-label={`View transaction on Etherscan (opens in new tab)`}
                  >
                    <ExternalLink
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
