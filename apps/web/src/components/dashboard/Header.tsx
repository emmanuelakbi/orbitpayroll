"use client";

import * as React from "react";
import { Menu, ChevronDown, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/auth";
import { NotificationBell } from "@/components/notifications";
import { NetworkIndicator } from "@/components/ui/network-indicator";
import type { Organization } from "@/lib/api/types";

interface HeaderProps {
  onMenuClick: () => void;
  organizations: Organization[];
  currentOrg: Organization | null;
  onOrgChange: (orgId: string) => void;
}

export function Header({
  onMenuClick,
  organizations,
  currentOrg,
  onOrgChange,
}: HeaderProps) {
  const [showOrgDropdown, setShowOrgDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowOrgDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-background border-b">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left side - Menu button and org switcher */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Hamburger menu button - 44px touch target on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            aria-expanded="false"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Organization Switcher */}
          {organizations.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="outline"
                className="flex items-center gap-2 min-h-[44px] md:min-h-0"
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                aria-expanded={showOrgDropdown}
                aria-haspopup="listbox"
              >
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline max-w-[150px] truncate">
                  {currentOrg?.name || "Select Organization"}
                </span>
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              </Button>

              {showOrgDropdown && (
                <div 
                  className="absolute left-0 mt-2 w-64 rounded-md shadow-lg bg-popover border border-border z-50"
                  role="listbox"
                  aria-label="Select organization"
                >
                  <div className="py-1">
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Organizations
                    </div>
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => {
                          onOrgChange(org.id);
                          setShowOrgDropdown(false);
                        }}
                        role="option"
                        aria-selected={currentOrg?.id === org.id}
                        className="w-full px-4 py-3 text-sm text-left hover:bg-accent active:bg-accent/80 transition-colors flex items-center justify-between min-h-[44px]"
                      >
                        <span className="truncate">{org.name}</span>
                        {currentOrg?.id === org.id && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right side - Notifications and user */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Network Indicator - shows testnet/mock status */}
          <NetworkIndicator compact />

          {/* Notification Bell */}
          <NotificationBell />

          {/* Connect Button / User Menu */}
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
