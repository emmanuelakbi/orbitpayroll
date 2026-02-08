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
import { formatMnee } from "@/lib/utils";
import type { Contractor, PayCycle } from "@/lib/api/types";
import { Pencil, Archive } from "lucide-react";

interface ContractorTableProps {
  contractors: Contractor[];
  isLoading: boolean;
  onEdit: (contractor: Contractor) => void;
  onArchive: (contractor: Contractor) => void;
  canManage?: boolean;
}

const payCycleLabels: Record<PayCycle, string> = {
  WEEKLY: "Weekly",
  BI_WEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
};

/**
 * Accessible Contractor Table component.
 *
 * WCAG 2.1 AA Compliance:
 * - Proper table semantics with scope attributes
 * - Action buttons have accessible labels
 * - Status badges use text, not just color
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.5
 */
export function ContractorTable({
  contractors,
  isLoading,
  onEdit,
  onArchive,
  canManage = true,
}: ContractorTableProps) {
  if (isLoading) {
    return <ContractorTableSkeleton />;
  }

  if (contractors.length === 0) {
    return null;
  }

  return (
    <Table aria-label="Contractors list">
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Name</TableHead>
          <TableHead scope="col">Wallet</TableHead>
          <TableHead scope="col">Rate</TableHead>
          <TableHead scope="col">Pay Cycle</TableHead>
          <TableHead scope="col">Status</TableHead>
          {canManage && (
            <TableHead scope="col" className="w-[100px]">
              Actions
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {contractors.map((contractor) => (
          <TableRow key={contractor.id}>
            <TableCell className="font-medium">{contractor.name}</TableCell>
            <TableCell className="font-mono text-sm">
              <span aria-label={`Wallet address: ${contractor.walletAddress}`}>
                {formatAddress(contractor.walletAddress)}
              </span>
            </TableCell>
            <TableCell>
              {formatMnee(contractor.rateAmount)} {contractor.rateCurrency}
            </TableCell>
            <TableCell>{payCycleLabels[contractor.payCycle]}</TableCell>
            <TableCell>
              <Badge
                variant={contractor.active ? "success" : "secondary"}
                aria-label={`Status: ${
                  contractor.active ? "Active" : "Archived"
                }`}
              >
                {contractor.active ? "Active" : "Archived"}
              </Badge>
            </TableCell>
            {canManage && (
              <TableCell>
                <div
                  className="flex items-center gap-2"
                  role="group"
                  aria-label={`Actions for ${contractor.name}`}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(contractor)}
                    aria-label={`Edit ${contractor.name}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  {contractor.active && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onArchive(contractor)}
                      aria-label={`Archive ${contractor.name}`}
                    >
                      <Archive className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ContractorTableSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading contractors">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b">
        <Skeleton className="h-4 w-24" aria-hidden="true" />
        <Skeleton className="h-4 w-28" aria-hidden="true" />
        <Skeleton className="h-4 w-20" aria-hidden="true" />
        <Skeleton className="h-4 w-20" aria-hidden="true" />
        <Skeleton className="h-4 w-16" aria-hidden="true" />
        <Skeleton className="h-4 w-16" aria-hidden="true" />
      </div>
      {/* Rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b items-center">
          <Skeleton className="h-4 w-24" aria-hidden="true" />
          <Skeleton className="h-4 w-28" aria-hidden="true" />
          <Skeleton className="h-4 w-20" aria-hidden="true" />
          <Skeleton className="h-4 w-20" aria-hidden="true" />
          <Skeleton className="h-5 w-16 rounded-full" aria-hidden="true" />
          <Skeleton className="h-8 w-16" aria-hidden="true" />
        </div>
      ))}
      <span className="sr-only">Loading contractors list...</span>
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
 *
 * Validates: Requirements 7.1, 7.2, 7.3
 */
export function ContractorCard({
  contractor,
  onEdit,
  onArchive,
  canManage = true,
}: {
  contractor: Contractor;
  onEdit: (contractor: Contractor) => void;
  onArchive: (contractor: Contractor) => void;
  canManage?: boolean;
}) {
  return (
    <article
      className="p-4 border rounded-lg space-y-3"
      aria-label={`Contractor: ${contractor.name}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{contractor.name}</h3>
          <p className="text-sm text-muted-foreground font-mono">
            <span className="sr-only">Wallet address: </span>
            {formatAddress(contractor.walletAddress)}
          </p>
        </div>
        <Badge
          variant={contractor.active ? "success" : "secondary"}
          aria-label={`Status: ${contractor.active ? "Active" : "Archived"}`}
        >
          {contractor.active ? "Active" : "Archived"}
        </Badge>
      </div>
      <dl>
        <div className="flex items-center justify-between text-sm min-h-[44px]">
          <dt className="text-muted-foreground">Rate</dt>
          <dd>
            {formatMnee(contractor.rateAmount)} {contractor.rateCurrency}
          </dd>
        </div>
        <div className="flex items-center justify-between text-sm min-h-[44px]">
          <dt className="text-muted-foreground">Pay Cycle</dt>
          <dd>{payCycleLabels[contractor.payCycle]}</dd>
        </div>
      </dl>
      {canManage && (
        <div
          className="flex gap-2 pt-2 border-t"
          role="group"
          aria-label={`Actions for ${contractor.name}`}
        >
          <Button
            variant="outline"
            size="default"
            className="flex-1 min-h-[44px]"
            onClick={() => onEdit(contractor)}
            aria-label={`Edit ${contractor.name}`}
          >
            <Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
            Edit
          </Button>
          {contractor.active && (
            <Button
              variant="outline"
              size="default"
              className="flex-1 min-h-[44px]"
              onClick={() => onArchive(contractor)}
              aria-label={`Archive ${contractor.name}`}
            >
              <Archive className="h-4 w-4 mr-2" aria-hidden="true" />
              Archive
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
