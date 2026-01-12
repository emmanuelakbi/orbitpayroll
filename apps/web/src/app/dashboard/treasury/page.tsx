"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useDashboard } from "@/components/dashboard";
import { TreasuryBalanceCard, DepositModal, TransactionHistory } from "@/components/treasury";
import { DashboardSkeleton, QueryError } from "@/components/dashboard";
import { api } from "@/lib/api";

export default function TreasuryPage() {
  const { currentOrg, isLoading: orgLoading } = useDashboard();
  const [depositModalOpen, setDepositModalOpen] = React.useState(false);

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
  } = useQuery({
    queryKey: ["payroll-preview", currentOrg?.id],
    queryFn: () => api.payroll.preview(currentOrg!.id),
    enabled: !!currentOrg?.id,
    retry: 2,
  });

  const isLoading = orgLoading || treasuryLoading;

  // Handle deposit success
  const handleDepositSuccess = React.useCallback(() => {
    setDepositModalOpen(false);
    refetchTreasury();
  }, [refetchTreasury]);

  if (orgLoading) {
    return <DashboardSkeleton />;
  }

  if (!currentOrg) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No organization selected</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Treasury</h1>
        <p className="text-muted-foreground">
          Manage your organization&apos;s MNEE treasury
        </p>
      </div>

      {/* Error State */}
      {treasuryError && (
        <QueryError
          error={treasuryError as Error}
          title="Failed to load treasury data"
          onRetry={() => refetchTreasury()}
        />
      )}

      {/* Treasury Content */}
      {!treasuryError && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Balance Card */}
          <TreasuryBalanceCard
            balance={treasury?.balance || "0"}
            contractAddress={treasury?.address || currentOrg.treasuryAddress || ""}
            upcomingPayroll={payrollPreview?.total}
            isLoading={isLoading}
            onDeposit={() => setDepositModalOpen(true)}
          />

          {/* Transaction History */}
          <TransactionHistory
            orgId={currentOrg.id}
            treasuryAddress={treasury?.address || currentOrg.treasuryAddress || ""}
          />
        </div>
      )}

      {/* Deposit Modal */}
      <DepositModal
        open={depositModalOpen}
        onOpenChange={setDepositModalOpen}
        treasuryAddress={treasury?.address || currentOrg.treasuryAddress || ""}
        onSuccess={handleDepositSuccess}
      />
    </div>
  );
}
