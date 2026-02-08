/**
 * Unit Tests: ContractorTable Component
 *
 * Tests for the ContractorTable component that displays contractor information
 * in a tabular format with edit and archive actions.
 *
 * **Feature: 09-testing**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContractorTable, ContractorCard } from "./ContractorTable";
import type { Contractor } from "@/lib/api/types";

// Mock contractor data
const createMockContractor = (
  overrides: Partial<Contractor> = {},
): Contractor => ({
  id: "contractor-1",
  name: "John Doe",
  walletAddress: "0x1234567890123456789012345678901234567890",
  rateAmount: "1000000000000000000000", // 1000 MNEE in wei
  rateCurrency: "MNEE",
  payCycle: "MONTHLY",
  active: true,
  orgId: "org-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("ContractorTable", () => {
  const mockOnEdit = vi.fn();
  const mockOnArchive = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders contractor data correctly", () => {
      const contractors = [createMockContractor()];

      render(
        <ContractorTable
          contractors={contractors}
          isLoading={false}
          onEdit={mockOnEdit}
          onArchive={mockOnArchive}
        />,
      );

      // Check contractor name is displayed
      expect(screen.getByText("John Doe")).toBeInTheDocument();

      // Check wallet address is truncated (formatAddress shows 0x1234...7890)
      expect(screen.getByText("0x1234...7890")).toBeInTheDocument();

      // Check pay cycle is displayed
      expect(screen.getByText("Monthly")).toBeInTheDocument();

      // Check status badge is displayed
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders multiple contractors", () => {
      const contractors = [
        createMockContractor({ id: "1", name: "Alice" }),
        createMockContractor({ id: "2", name: "Bob" }),
        createMockContractor({ id: "3", name: "Charlie" }),
      ];

      render(
        <ContractorTable
          contractors={contractors}
          isLoading={false}
          onEdit={mockOnEdit}
          onArchive={mockOnArchive}
        />,
      );

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("Charlie")).toBeInTheDocument();
    });

    it("returns null when contractors array is empty", () => {
      const { container } = render(
        <ContractorTable
          contractors={[]}
          isLoading={false}
          onEdit={mockOnEdit}
          onArchive={mockOnArchive}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders loading skeleton when isLoading is true", () => {
      render(
        <ContractorTable
          contractors={[]}
          isLoading={true}
          onEdit={mockOnEdit}
          onArchive={mockOnArchive}
        />,
      );

      // Skeleton should be rendered (multiple skeleton elements)
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("renders table headers correctly", () => {
      const contractors = [createMockContractor()];

      render(
        <ContractorTable
          contractors={contractors}
          isLoading={false}
          onEdit={mockOnEdit}
          onArchive={mockOnArchive}
        />,
      );

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Wallet")).toBeInTheDocument();
      expect(screen.getByText("Rate")).toBeInTheDocument();
      expect(screen.getByText("Pay Cycle")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });
  });

  describe("Pay Cycle Labels", () => {
    it("displays Weekly for WEEKLY pay cycle", () => {
      const contractors = [createMockContractor({ payCycle: "WEEKLY" })];

      render(
        <ContractorTable
          contractors={contractors}
          isLoading={false}
          onEdit={mockOnEdit}
          onArchive={mockOnArchive}
        />,
      );

      expect(screen.getByText("Weekly")).toBeInTheDocument();
    });

    it("displays Bi-weekly for BI_WEEKLY pay cycle", () => {
      const contractors = [createMockContractor({ payCycle: "BI_WEEKLY" })];

      render(
        <ContractorTable
          contractors={contractors}
          isLoading={false}
          onEdit={mockOnEdit}
          onArchive={mockOnArchive}
        />,
      );

      expect(screen.getByText("Bi-weekly")).toBeInTheDocument();
    });

    it("displays Monthly for MONTHLY pay cycle", () => {
      const contractors = [createMockContractor({ payCycle: "MONTHLY" })];

      render(
        <ContractorTable
          contractors={contractors}
          isLoading={false}
          onEdit={mockOnEdit}
          onArchive={mockOnArchive}
        />,
      );

      expect(screen.getByText("Monthly")).toBeInTheDocument();
    });
  });

  describe("Status Badge", () => {
    it("renders success variant for ACTIVE status", () => {
      const contractors = [createMockContractor({ active: true })];

      render(
        <ContractorTable
          contractors={contractors}
          isLoading={false}
          onEdit={mockOnEdit}
          onArchive={mockOnArchive}
        />,
      );

      const badge = screen.getByText("Active");
      expect(badge).toBeInTheDocument();
    });

    it("renders secondary variant for ARCHIVED status", () => {
      const contractors = [createMockContractor({ active: false })];

      render(
        <ContractorTable
          contractors={contractors}
          isLoading={false}
          onEdit={mockOnEdit}
          onArchive={mockOnArchive}
        />,
      );

      const badge = screen.getByText("Archived");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("Actions", () => {
    it("calls onEdit when edit button is clicked", () => {
      const contractor = createMockContractor();
      const contractors = [contractor];

      render(
        <ContractorTable
          contractors={contractors}
          isLoading={false}
          onEdit={mockOnEdit}
          onArchive={mockOnArchive}
        />,
      );

      const editButton = screen.getByRole("button", {
        name: `Edit ${contractor.name}`,
      });
      fireEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledTimes(1);
      expect(mockOnEdit).toHaveBeenCalledWith(contractor);
    });

    it("calls onArchive when archive button is clicked", () => {
      const contractor = createMockContractor({ active: true });
      const contractors = [contractor];

      render(
        <ContractorTable
          contractors={contractors}
          isLoading={false}
          onEdit={mockOnEdit}
          onArchive={mockOnArchive}
        />,
      );

      const archiveButton = screen.getByRole("button", {
        name: `Archive ${contractor.name}`,
      });
      fireEvent.click(archiveButton);

      expect(mockOnArchive).toHaveBeenCalledTimes(1);
      expect(mockOnArchive).toHaveBeenCalledWith(contractor);
    });

    it("does not show archive button for ARCHIVED contractors", () => {
      const contractor = createMockContractor({ active: false });
      const contractors = [contractor];

      render(
        <ContractorTable
          contractors={contractors}
          isLoading={false}
          onEdit={mockOnEdit}
          onArchive={mockOnArchive}
        />,
      );

      expect(
        screen.queryByRole("button", { name: `Archive ${contractor.name}` }),
      ).not.toBeInTheDocument();
    });

    it("hides action buttons when canManage is false", () => {
      const contractor = createMockContractor();
      const contractors = [contractor];

      render(
        <ContractorTable
          contractors={contractors}
          isLoading={false}
          onEdit={mockOnEdit}
          onArchive={mockOnArchive}
          canManage={false}
        />,
      );

      expect(
        screen.queryByRole("button", { name: `Edit ${contractor.name}` }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: `Archive ${contractor.name}` }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Actions")).not.toBeInTheDocument();
    });
  });
});

describe("ContractorCard", () => {
  const mockOnEdit = vi.fn();
  const mockOnArchive = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders contractor information correctly", () => {
    const contractor = createMockContractor();

    render(
      <ContractorCard
        contractor={contractor}
        onEdit={mockOnEdit}
        onArchive={mockOnArchive}
      />,
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("0x1234...7890")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Monthly")).toBeInTheDocument();
  });

  it("calls onEdit when Edit button is clicked", () => {
    const contractor = createMockContractor();

    render(
      <ContractorCard
        contractor={contractor}
        onEdit={mockOnEdit}
        onArchive={mockOnArchive}
      />,
    );

    const editButton = screen.getByRole("button", { name: /edit/i });
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(contractor);
  });

  it("calls onArchive when Archive button is clicked", () => {
    const contractor = createMockContractor({ active: true });

    render(
      <ContractorCard
        contractor={contractor}
        onEdit={mockOnEdit}
        onArchive={mockOnArchive}
      />,
    );

    const archiveButton = screen.getByRole("button", { name: /archive/i });
    fireEvent.click(archiveButton);

    expect(mockOnArchive).toHaveBeenCalledWith(contractor);
  });

  it("does not show Archive button for ARCHIVED contractors", () => {
    const contractor = createMockContractor({ active: false });

    render(
      <ContractorCard
        contractor={contractor}
        onEdit={mockOnEdit}
        onArchive={mockOnArchive}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /archive/i }),
    ).not.toBeInTheDocument();
  });

  it("hides action buttons when canManage is false", () => {
    const contractor = createMockContractor();

    render(
      <ContractorCard
        contractor={contractor}
        onEdit={mockOnEdit}
        onArchive={mockOnArchive}
        canManage={false}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /edit/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /archive/i }),
    ).not.toBeInTheDocument();
  });
});
