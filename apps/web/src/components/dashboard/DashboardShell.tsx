"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { DevBanner } from "@/components/ui/network-indicator";
import { SkipLink } from "@/components/ui/skip-link";
import { api } from "@/lib/api";
import type { Organization } from "@/lib/api/types";

interface DashboardShellProps {
  children: React.ReactNode;
}

// Store for current org selection
const ORG_STORAGE_KEY = "orbitpayroll_current_org";

function getStoredOrgId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ORG_STORAGE_KEY);
}

function setStoredOrgId(orgId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ORG_STORAGE_KEY, orgId);
}

/**
 * Dashboard Shell component with accessibility features.
 *
 * WCAG 2.1 AA Compliance:
 * - Skip link for keyboard navigation (7.2)
 * - Proper landmark regions (main, nav, header)
 * - Focus management for sidebar
 *
 * Validates: Requirements 7.1, 7.2
 */
export function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [currentOrgId, setCurrentOrgId] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch organizations
  const { data: orgsData = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => api.orgs.list(),
  });

  // Ensure organizations is always an array - memoized to prevent dependency changes
  const organizations = React.useMemo(
    () => (Array.isArray(orgsData) ? orgsData : []),
    [orgsData],
  );

  // Auto-create org when user has none
  const { mutate: createOrganization, isPending: isCreatingOrg, isSuccess: hasCreatedOrg } = useMutation({
    mutationFn: () => api.orgs.create({ name: "My Organization" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  React.useEffect(() => {
    if (!orgsLoading && organizations.length === 0 && !isCreatingOrg && !hasCreatedOrg) {
      createOrganization();
    }
  }, [orgsLoading, organizations.length, isCreatingOrg, hasCreatedOrg, createOrganization]);

  // Initialize current org from storage or first org
  React.useEffect(() => {
    if (organizations.length > 0 && !currentOrgId) {
      const storedId = getStoredOrgId();
      const validStoredOrg = organizations.find((org) => org.id === storedId);

      if (validStoredOrg) {
        setCurrentOrgId(validStoredOrg.id);
      } else {
        setCurrentOrgId(organizations[0].id);
        setStoredOrgId(organizations[0].id);
      }
    }
  }, [organizations, currentOrgId]);

  const currentOrg = React.useMemo(
    () => organizations.find((org) => org.id === currentOrgId) || null,
    [organizations, currentOrgId],
  );

  const handleOrgChange = React.useCallback((orgId: string) => {
    setCurrentOrgId(orgId);
    setStoredOrgId(orgId);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Skip link for keyboard navigation - WCAG 2.4.1 */}
      <SkipLink targetId="main-content" />

      {/* Development Banner - shows testnet/mock status */}
      <DevBanner />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
          {/* Header */}
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            organizations={organizations}
            currentOrg={currentOrg}
            onOrgChange={handleOrgChange}
          />

          {/* Page content - main landmark with focusable target for skip link */}
          <main
            id="main-content"
            className="flex-1 p-4 md:p-6 lg:p-8 outline-none"
            tabIndex={-1}
            aria-label="Main content"
          >
            <DashboardContext.Provider
              value={{
                currentOrg,
                organizations,
                isLoading: orgsLoading,
                setCurrentOrg: handleOrgChange,
              }}
            >
              {children}
            </DashboardContext.Provider>
          </main>
        </div>
      </div>
    </div>
  );
}

// Context for dashboard state
interface DashboardContextValue {
  currentOrg: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  setCurrentOrg: (orgId: string) => void;
}

const DashboardContext = React.createContext<DashboardContextValue>({
  currentOrg: null,
  organizations: [],
  isLoading: false,
  setCurrentOrg: () => {},
});

export function useDashboard() {
  const context = React.useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within DashboardShell");
  }
  return context;
}
