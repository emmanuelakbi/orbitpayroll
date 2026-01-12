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
  BIWEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
};

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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Wallet</TableHead>
          <TableHead>Rate</TableHead>
          <TableHead>Pay Cycle</TableHead>
          <TableHead>Status</TableHead>
          {canManage && <TableHead className="w-[100px]">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {contractors.map((contractor) => (
          <TableRow key={contractor.id}>
            <TableCell className="font-medium">{contractor.name}</TableCell>
            <TableCell className="font-mono text-sm">
              {formatAddress(contractor.walletAddress)}
            </TableCell>
            <TableCell>
              {formatMnee(contractor.rateAmount)} {contractor.rateCurrency}
            </TableCell>
            <TableCell>{payCycleLabels[contractor.payCycle]}</TableCell>
            <TableCell>
              <Badge
                variant={contractor.status === "ACTIVE" ? "success" : "secondary"}
              >
                {contractor.status}
              </Badge>
            </TableCell>
            {canManage && (
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(contractor)}
                    title="Edit contractor"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {contractor.status === "ACTIVE" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onArchive(contractor)}
                      title="Archive contractor"
                    >
                      <Archive className="h-4 w-4" />
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
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b items-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

// Mobile card layout for responsive design
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
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{contractor.name}</h3>
          <p className="text-sm text-muted-foreground font-mono">
            {formatAddress(contractor.walletAddress)}
          </p>
        </div>
        <Badge
          variant={contractor.status === "ACTIVE" ? "success" : "secondary"}
        >
          {contractor.status}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-sm min-h-[44px]">
        <span className="text-muted-foreground">Rate</span>
        <span>
          {formatMnee(contractor.rateAmount)} {contractor.rateCurrency}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm min-h-[44px]">
        <span className="text-muted-foreground">Pay Cycle</span>
        <span>{payCycleLabels[contractor.payCycle]}</span>
      </div>
      {canManage && (
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="default"
            className="flex-1 min-h-[44px]"
            onClick={() => onEdit(contractor)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {contractor.status === "ACTIVE" && (
            <Button
              variant="outline"
              size="default"
              className="flex-1 min-h-[44px]"
              onClick={() => onArchive(contractor)}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
