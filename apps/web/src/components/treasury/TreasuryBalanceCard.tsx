"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMnee } from "@/lib/utils";
import { formatAddress } from "@/lib/auth";
import { Wallet, Copy, Check, ExternalLink, AlertCircle } from "lucide-react";

interface TreasuryBalanceCardProps {
  balance: string;
  contractAddress: string;
  upcomingPayroll?: string;
  isLoading?: boolean;
  onDeposit: () => void;
}

export function TreasuryBalanceCard({
  balance,
  contractAddress,
  upcomingPayroll,
  isLoading = false,
  onDeposit,
}: TreasuryBalanceCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyAddress = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  }, [contractAddress]);

  // Calculate if balance is sufficient
  const balanceBigInt = BigInt(balance || "0");
  const upcomingBigInt = BigInt(upcomingPayroll || "0");
  const isSufficient = balanceBigInt >= upcomingBigInt;
  const deficit = upcomingBigInt - balanceBigInt;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Treasury Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Treasury Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div>
          <p className="text-4xl font-bold">{formatMnee(balance)}</p>
          <p className="text-sm text-muted-foreground">MNEE</p>
        </div>

        {/* Contract Address */}
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">Contract:</span>
          <code className="text-sm font-mono">
            {formatAddress(contractAddress)}
          </code>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleCopyAddress}
            title="Copy address"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            asChild
            title="View on explorer"
          >
            <a
              href={`https://sepolia.etherscan.io/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>

        {/* Upcoming Payroll Comparison */}
        {upcomingPayroll && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Upcoming Payroll:</span>
              <span className="font-medium">{formatMnee(upcomingPayroll)} MNEE</span>
            </div>
            {!isSufficient && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Insufficient Balance</p>
                  <p className="text-muted-foreground">
                    You need {formatMnee(deficit.toString())} more MNEE
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Deposit Button */}
        <Button onClick={onDeposit} className="w-full">
          Deposit MNEE
        </Button>
      </CardContent>
    </Card>
  );
}
