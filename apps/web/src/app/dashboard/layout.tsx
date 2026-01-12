"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth";
import { DashboardShell, QueryErrorBoundary } from "@/components/dashboard";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isValidating } = useSession();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    
    // Wait for validation to complete
    if (isValidating) return;

    // Redirect to auth if not authenticated
    if (!isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, isValidating, router, mounted]);

  // Show loading while checking auth
  if (!mounted || isValidating || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell>
      <QueryErrorBoundary>
        {children}
      </QueryErrorBoundary>
    </DashboardShell>
  );
}
