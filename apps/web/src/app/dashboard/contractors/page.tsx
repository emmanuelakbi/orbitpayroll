"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination, PaginationInfo } from "@/components/ui/pagination";
import {
  ContractorTable,
  ContractorCard,
  ContractorFormModal,
  ArchiveContractorModal,
} from "@/components/contractors";
import { useDashboard, QueryError, EmptyState } from "@/components/dashboard";
import { api } from "@/lib/api";
import type { Contractor, ContractorInput } from "@/lib/api/types";
import { Plus, Search, Users } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

const ITEMS_PER_PAGE = 20;

export default function ContractorsPage() {
  const { currentOrg } = useDashboard();
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = React.useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const [selectedContractor, setSelectedContractor] =
    React.useState<Contractor | null>(null);

  // Reset page when search changes
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Fetch contractors
  const {
    data: contractorsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["contractors", currentOrg?.id, page, debouncedSearch],
    queryFn: () =>
      api.contractors.list(currentOrg!.id, {
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch || undefined,
      }),
    enabled: !!currentOrg?.id,
    staleTime: 30 * 1000, // 30 seconds - contractors don't change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Create contractor mutation
  const createMutation = useMutation({
    mutationFn: (data: ContractorInput) => {
      if (!currentOrg) throw new Error("No organization selected");
      return api.contractors.create(currentOrg.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contractors", currentOrg?.id],
      });
      setIsFormModalOpen(false);
      setSelectedContractor(null);
    },
  });

  // Update contractor mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ContractorInput>;
    }) => {
      if (!currentOrg) throw new Error("No organization selected");
      return api.contractors.update(currentOrg.id, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contractors", currentOrg?.id],
      });
      setIsFormModalOpen(false);
      setSelectedContractor(null);
    },
  });

  // Archive contractor mutation
  const archiveMutation = useMutation({
    mutationFn: (id: string) => {
      if (!currentOrg) throw new Error("No organization selected");
      return api.contractors.archive(currentOrg.id, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contractors", currentOrg?.id],
      });
      setIsArchiveModalOpen(false);
      setSelectedContractor(null);
    },
  });

  // Handlers
  const handleAddContractor = () => {
    setSelectedContractor(null);
    setIsFormModalOpen(true);
  };

  const handleEditContractor = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setIsFormModalOpen(true);
  };

  const handleArchiveContractor = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setIsArchiveModalOpen(true);
  };

  const handleFormSubmit = async (data: ContractorInput) => {
    if (!currentOrg) return;
    if (selectedContractor) {
      await updateMutation.mutateAsync({ id: selectedContractor.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleArchiveConfirm = async () => {
    if (selectedContractor) {
      await archiveMutation.mutateAsync(selectedContractor.id);
    }
  };

  const contractors = contractorsData?.data ?? [];
  const pagination = contractorsData?.meta;

  // TODO: Check user role for canManage - for now assume admin
  const canManage = true;

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Contractors</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your organization&apos;s contractors
          </p>
        </div>
        {canManage && (
          <Button onClick={handleAddContractor} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Add Contractor
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or wallet..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <QueryError
          error={error as Error}
          title="Failed to load contractors"
          onRetry={() => refetch()}
        />
      )}

      {/* Content */}
      {!error && (
        <Card>
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden md:block">
              <ContractorTable
                contractors={contractors}
                isLoading={isLoading}
                onEdit={handleEditContractor}
                onArchive={handleArchiveContractor}
                canManage={canManage}
              />
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-4 space-y-4">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="p-4 border rounded-lg animate-pulse"
                    >
                      <div className="h-4 w-32 bg-muted rounded mb-2" />
                      <div className="h-3 w-24 bg-muted rounded" />
                    </div>
                  ))
                : contractors.map((contractor) => (
                    <ContractorCard
                      key={contractor.id}
                      contractor={contractor}
                      onEdit={handleEditContractor}
                      onArchive={handleArchiveContractor}
                      canManage={canManage}
                    />
                  ))}
            </div>

            {/* Empty State */}
            {!isLoading && contractors.length === 0 && (
              <EmptyState
                icon={<Users className="h-6 w-6 text-muted-foreground" />}
                title={
                  debouncedSearch
                    ? "No contractors found"
                    : "No contractors yet"
                }
                description={
                  debouncedSearch
                    ? "Try adjusting your search terms"
                    : "Add your first contractor to get started with payroll"
                }
                action={
                  !debouncedSearch && canManage ? (
                    <Button onClick={handleAddContractor}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Contractor
                    </Button>
                  ) : undefined
                }
              />
            )}
          </CardContent>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
              <PaginationInfo
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit}
              />
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </Card>
      )}

      {/* Form Modal */}
      <ContractorFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedContractor(null);
        }}
        contractor={selectedContractor ?? undefined}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        error={createMutation.error || updateMutation.error}
      />

      {/* Archive Modal */}
      <ArchiveContractorModal
        isOpen={isArchiveModalOpen}
        onClose={() => {
          setIsArchiveModalOpen(false);
          setSelectedContractor(null);
        }}
        contractor={selectedContractor}
        onConfirm={handleArchiveConfirm}
        isArchiving={archiveMutation.isPending}
      />
    </div>
  );
}
