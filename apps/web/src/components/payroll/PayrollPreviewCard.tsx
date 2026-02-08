"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMnee } from "@/lib/utils";
import { formatAddress } from "@/lib/auth";
import { Users, Wallet, AlertCircle } from "lucide-react";
import type { PayrollPreview } from "@/lib/api/types";

interface PayrollPreviewCardProps {
  preview: PayrollPreview | undefined;
  isLoading?: boolean;
}

/**
 * Accessible Payroll Preview Card component.
 *
 * WCAG 2.1 AA Compliance:
 * - Proper heading structure
 * - Descriptive labels for screen readers
 * - Status information uses text, not just color
 *
 * Validates: Requirements 7.1, 7.3, 7.5
 */
export function PayrollPreviewCard({
  preview,
  isLoading = false,
}: PayrollPreviewCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" aria-hidden="true" />
            Payroll Preview
          </CardTitle>
        </CardHeader>
        <CardContent
          className="space-y-4"
          role="status"
          aria-label="Loading payroll preview"
        >
          <Skeleton className="h-8 w-full" aria-hidden="true" />
          <Skeleton className="h-8 w-full" aria-hidden="true" />
          <Skeleton className="h-8 w-full" aria-hidden="true" />
          <span className="sr-only">Loading payroll preview...</span>
        </CardContent>
      </Card>
    );
  }

  if (!preview || preview.contractors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" aria-hidden="true" />
            Payroll Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users
              className="h-12 w-12 mx-auto mb-4 opacity-50"
              aria-hidden="true"
            />
            <p>No active contractors to pay</p>
            <p className="text-sm mt-1">Add contractors to run payroll</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" aria-hidden="true" />
          Contractor Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3" aria-label="Contractors to be paid">
          {preview.contractors.map((contractor) => (
            <li
              key={contractor.id}
              className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col">
                <span className="font-medium">{contractor.name}</span>
                <span className="text-sm text-muted-foreground font-mono break-all">
                  <span className="sr-only">Wallet address: </span>
                  {formatAddress(contractor.walletAddress)}
                </span>
              </div>
              <div className="text-left sm:text-right">
                <span
                  className="font-semibold"
                  aria-label={`Payment amount: ${formatMnee(
                    contractor.amount,
                  )} MNEE`}
                >
                  {formatMnee(contractor.amount)}
                </span>
                <span
                  className="text-sm text-muted-foreground ml-1"
                  aria-hidden="true"
                >
                  MNEE
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

interface PayrollSummaryCardProps {
  preview: PayrollPreview | undefined;
  isLoading?: boolean;
}

/**
 * Accessible Payroll Summary Card component.
 *
 * WCAG 2.1 AA Compliance:
 * - Proper heading structure
 * - Alert role for insufficient balance warning
 * - Status information uses text, not just color
 *
 * Validates: Requirements 7.1, 7.3, 7.5
 */
export function PayrollSummaryCard({
  preview,
  isLoading = false,
}: PayrollSummaryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" aria-hidden="true" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent
          className="space-y-4"
          role="status"
          aria-label="Loading payment summary"
        >
          <Skeleton className="h-12 w-32" aria-hidden="true" />
          <Skeleton className="h-4 w-48" aria-hidden="true" />
          <Skeleton className="h-4 w-48" aria-hidden="true" />
          <span className="sr-only">Loading payment summary...</span>
        </CardContent>
      </Card>
    );
  }

  if (!preview) {
    return null;
  }

  const total = parseFloat(preview.totalMnee || "0");
  const balance = parseFloat(preview.treasuryBalance || "0");
  const afterPayroll = balance - total;
  const deficit = total > balance ? total - balance : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" aria-hidden="true" />
          Payment Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Amount */}
        <div>
          <p className="text-sm text-muted-foreground" id="total-payroll-label">
            Total Payroll
          </p>
          <p
            className="text-3xl font-bold"
            aria-labelledby="total-payroll-label"
          >
            {formatMnee(preview.totalMnee)}
          </p>
          <p className="text-sm text-muted-foreground" aria-hidden="true">
            MNEE
          </p>
        </div>

        {/* Balance Comparison */}
        <dl className="space-y-2 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <dt className="text-muted-foreground">Treasury Balance:</dt>
            <dd className="font-medium">
              {formatMnee(preview.treasuryBalance)} MNEE
            </dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-muted-foreground">Required Amount:</dt>
            <dd className="font-medium">
              {formatMnee(preview.totalMnee)} MNEE
            </dd>
          </div>
          <div className="flex justify-between text-sm font-medium">
            <dt>After Payroll:</dt>
            <dd
              className={
                preview.isSufficient ? "text-green-600" : "text-destructive"
              }
            >
              {preview.isSufficient
                ? `${formatMnee(afterPayroll.toString())} MNEE`
                : `-${formatMnee(deficit.toString())} MNEE`}
              <span className="sr-only">
                {preview.isSufficient
                  ? " (sufficient funds)"
                  : " (insufficient funds)"}
              </span>
            </dd>
          </div>
        </dl>

        {/* Insufficient Balance Warning */}
        {!preview.isSufficient && (
          <div
            className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle
              className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
            <div className="text-sm">
              <p className="font-medium text-destructive">
                Insufficient Balance
              </p>
              <p className="text-muted-foreground">
                You need {formatMnee(deficit.toString())} more MNEE to run
                payroll. Please deposit funds first.
              </p>
            </div>
          </div>
        )}

        {/* Contractor Count */}
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {preview.contractors.length} contractor
            {preview.contractors.length !== 1 ? "s" : ""} will be paid
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
