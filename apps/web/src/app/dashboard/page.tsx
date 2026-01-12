"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession, formatAddress } from "@/lib/auth";
import {
  useDashboard,
  StatCard,
  DashboardSkeleton,
  QueryError,
} from "@/components/dashboard";
import { api } from "@/lib/api";
import { formatMnee } from "@/lib/utils";
import { Wallet, CreditCard, Clock, ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useSession();
  const { currentOrg, isLoading: orgLoading } = useDashboard();

  // Fetch treasury data
  const {
    data: treasury,
    isLoading: treasuryLoading,
    error: treasuryError,
    refetch: refetchTreasury,
  } = useQuery({
    queryKey: ["treasury", currentOrg?.id],
    queryFn: () => api.treasury.get(currentOrg!.id),
    enabled: !!currentOrg?.id,
    retry: 2,
  });

  // Fetch payroll preview for upcoming payroll total
  const {
    data: payrollPreview,
    isLoading: previewLoading,
    error: previewError,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: ["payroll-preview", currentOrg?.id],
    queryFn: () => api.payroll.preview(currentOrg!.id),
    enabled: !!currentOrg?.id,
    retry: 2,
  });

  // Calculate next payroll date (simplified - would come from backend in real app)
  const getNextPayrollDate = (): string => {
    // For now, return a placeholder
    // In a real app, this would be calculated based on contractor pay cycles
    return "Not scheduled";
  };

  const isLoading = orgLoading || treasuryLoading || previewLoading;
  const hasError = !!treasuryError || !!previewError;

  // Check if treasury balance is sufficient
  const isSufficient = payrollPreview?.isSufficient ?? true;

  // Show skeleton while loading initial data
  if (orgLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user ? formatAddress(user.walletAddress) : "User"}
        </p>
      </div>

      {/* Insufficient Balance Warning */}
      {!isLoading && !isSufficient && payrollPreview && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Insufficient Treasury Balance</p>
            <p className="text-sm text-muted-foreground">
              Your treasury needs {formatMnee(payrollPreview.total)} MNEE for the next payroll,
              but only has {formatMnee(treasury?.balance || "0")} MNEE.
            </p>
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link href="/dashboard/treasury">Fund Treasury</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Treasury Balance Card */}
        <StatCard
          title="Treasury Balance"
          value={treasury ? formatMnee(treasury.balance) : "--"}
          subtitle="MNEE"
          icon={<Wallet className="w-6 h-6" />}
          isLoading={treasuryLoading}
        />

        {/* Upcoming Payroll Card */}
        <StatCard
          title="Upcoming Payroll"
          value={payrollPreview ? formatMnee(payrollPreview.total) : "--"}
          subtitle={
            payrollPreview
              ? `${payrollPreview.contractors.length} contractor${payrollPreview.contractors.length !== 1 ? "s" : ""}`
              : "MNEE"
          }
          icon={<CreditCard className="w-6 h-6" />}
          isLoading={previewLoading}
        />

        {/* Next Payroll Date Card */}
        <StatCard
          title="Next Payroll"
          value={getNextPayrollDate()}
          subtitle="Upcoming payment date"
          icon={<Clock className="w-6 h-6" />}
          isLoading={orgLoading}
        />
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/contractors">
              Add Contractor
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/treasury">
              Fund Treasury
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            disabled={!isSufficient}
          >
            <Link href="/dashboard/payroll">
              Run Payroll
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Organization Info */}
      {currentOrg && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Organization</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{currentOrg.name}</span>
                </div>
                {currentOrg.treasuryAddress && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Treasury</span>
                    <span className="font-mono text-sm">
                      {formatAddress(currentOrg.treasuryAddress)}
                    </span>
                  </div>
                )}
                {treasury?.address && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="font-medium">
                      {formatMnee(treasury.balance)} MNEE
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error States */}
      {hasError && (
        <div className="mt-8 space-y-4">
          {treasuryError && (
            <QueryError
              error={treasuryError as Error}
              title="Failed to load treasury data"
              onRetry={() => refetchTreasury()}
              compact
            />
          )}
          {previewError && (
            <QueryError
              error={previewError as Error}
              title="Failed to load payroll preview"
              onRetry={() => refetchPreview()}
              compact
            />
          )}
        </div>
      )}
    </div>
  );
}
