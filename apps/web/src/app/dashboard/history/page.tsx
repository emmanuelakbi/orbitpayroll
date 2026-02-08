"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useDashboard,
  DashboardSkeleton,
  QueryError,
  EmptyState,
} from "@/components/dashboard";
import {
  PayrollHistoryTable,
  PayrollHistoryCard,
  PayrollRunDetailModal,
} from "@/components/payroll";
import { Pagination, PaginationInfo } from "@/components/ui/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatMnee, formatDate } from "@/lib/utils";
import type { PayrollRun } from "@/lib/api/types";
import { History, FileText } from "lucide-react";

const ITEMS_PER_PAGE = 20;

export default function PayrollHistoryPage() {
  const { currentOrg, isLoading: orgLoading } = useDashboard();
  const [page, setPage] = React.useState(1);
  const [selectedRun, setSelectedRun] = React.useState<PayrollRun | null>(null);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);

  // Fetch payroll runs list
  const {
    data: runsData,
    isLoading: runsLoading,
    error: runsError,
    refetch: refetchRuns,
  } = useQuery({
    queryKey: ["payroll-runs", currentOrg?.id, { page, limit: ITEMS_PER_PAGE }],
    queryFn: () =>
      api.payroll.list(currentOrg!.id, { page, limit: ITEMS_PER_PAGE }),
    enabled: !!currentOrg?.id,
    retry: 2,
  });

  // Fetch selected run details
  const { data: runDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["payroll-run-detail", currentOrg?.id, selectedRun?.id],
    queryFn: () => api.payroll.get(currentOrg!.id, selectedRun!.id),
    enabled: !!currentOrg?.id && !!selectedRun?.id && detailModalOpen,
    retry: 2,
  });

  const isLoading = orgLoading || runsLoading;
  const runs = runsData?.data ?? [];
  const pagination = runsData?.meta;

  // Handle view details
  const handleViewDetails = React.useCallback((run: PayrollRun) => {
    setSelectedRun(run);
    setDetailModalOpen(true);
  }, []);

  // Handle CSV export
  const handleExportCsv = React.useCallback(() => {
    if (!runDetail) return;

    const headers = ["Contractor Name", "Wallet Address", "Amount (MNEE)"];
    const rows = runDetail.items.map((item) => [
      item.contractorName,
      item.walletAddress,
      formatMnee(item.amountMnee),
    ]);

    const csvContent = [
      // Metadata
      `Payroll Run: ${runDetail.id}`,
      `Date: ${
        runDetail.executedAt ? formatDate(runDetail.executedAt) : "Pending"
      }`,
      `Total: ${formatMnee(runDetail.totalMnee)} MNEE`,
      `Status: ${runDetail.status}`,
      runDetail.txHash ? `Transaction: ${runDetail.txHash}` : "",
      "",
      // Headers and data
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-run-${runDetail.id}-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [runDetail]);

  // Handle page change
  const handlePageChange = React.useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

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
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Payroll History</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          View and export past payroll runs
        </p>
      </div>

      {/* Error State */}
      {runsError && (
        <QueryError
          error={runsError as Error}
          title="Failed to load payroll history"
          onRetry={() => refetchRuns()}
        />
      )}

      {/* Content */}
      {!runsError && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Past Payroll Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Empty State */}
            {!isLoading && runs.length === 0 && (
              <EmptyState
                icon={<FileText className="h-6 w-6 text-muted-foreground" />}
                title="No payroll runs yet"
                description="Once you execute a payroll, it will appear here for your records."
              />
            )}

            {/* Desktop Table */}
            <div className="hidden md:block">
              <PayrollHistoryTable
                runs={runs}
                isLoading={isLoading}
                onViewDetails={handleViewDetails}
              />
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="p-4 border rounded-lg animate-pulse"
                    >
                      <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  ))
                : runs.map((run) => (
                    <PayrollHistoryCard
                      key={run.id}
                      run={run}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <PaginationInfo
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.total}
                  itemsPerPage={pagination.limit}
                />
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      <PayrollRunDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        runDetail={runDetail ?? null}
        isLoading={detailLoading}
        onExportCsv={handleExportCsv}
      />
    </div>
  );
}
