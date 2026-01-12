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

export function PayrollPreviewCard({
  preview,
  isLoading = false,
}: PayrollPreviewCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Payroll Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!preview || preview.contractors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Payroll Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
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
          <Users className="h-5 w-5" />
          Contractor Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {preview.contractors.map((contractor) => (
            <div
              key={contractor.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex flex-col">
                <span className="font-medium">{contractor.name}</span>
                <span className="text-sm text-muted-foreground font-mono">
                  {formatAddress(contractor.walletAddress)}
                </span>
              </div>
              <div className="text-right">
                <span className="font-semibold">
                  {formatMnee(contractor.amount)}
                </span>
                <span className="text-sm text-muted-foreground ml-1">MNEE</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface PayrollSummaryCardProps {
  preview: PayrollPreview | undefined;
  isLoading?: boolean;
}

export function PayrollSummaryCard({
  preview,
  isLoading = false,
}: PayrollSummaryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  if (!preview) {
    return null;
  }

  const totalBigInt = BigInt(preview.total || "0");
  const balanceBigInt = BigInt(preview.treasuryBalance || "0");
  const deficit = totalBigInt - balanceBigInt;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Payment Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Amount */}
        <div>
          <p className="text-sm text-muted-foreground">Total Payroll</p>
          <p className="text-3xl font-bold">{formatMnee(preview.total)}</p>
          <p className="text-sm text-muted-foreground">MNEE</p>
        </div>

        {/* Balance Comparison */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Treasury Balance:</span>
            <span className="font-medium">
              {formatMnee(preview.treasuryBalance)} MNEE
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Required Amount:</span>
            <span className="font-medium">{formatMnee(preview.total)} MNEE</span>
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span>After Payroll:</span>
            <span
              className={
                preview.isSufficient ? "text-green-600" : "text-destructive"
              }
            >
              {preview.isSufficient
                ? `${formatMnee((balanceBigInt - totalBigInt).toString())} MNEE`
                : `-${formatMnee(deficit.toString())} MNEE`}
            </span>
          </div>
        </div>

        {/* Insufficient Balance Warning */}
        {!preview.isSufficient && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Insufficient Balance</p>
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
