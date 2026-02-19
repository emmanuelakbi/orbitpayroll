"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/auth";
import { useAuth, formatAddress } from "@/lib/auth";
import { Loader2, CheckCircle, XCircle, Wallet, ArrowRight } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const {
    address,
    isConnected,
    isAuthenticated,
    connectionState,
    authenticate,
    error,
  } = useAuth();

  const [authError, setAuthError] = React.useState<string | null>(null);

  // Redirect to dashboard if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  // Handle sign in
  const handleSignIn = React.useCallback(async () => {
    setAuthError(null);
    try {
      await authenticate();
      // Redirect happens via the useEffect above
    } catch (err) {
      if (err instanceof Error) {
        // Handle user rejection
        if (err.message.includes("rejected") || err.message.includes("denied")) {
          setAuthError("You rejected the signature request. Please try again to sign in.");
        } else {
          setAuthError(err.message);
        }
      } else {
        setAuthError("An unexpected error occurred. Please try again.");
      }
    }
  }, [authenticate]);

  const isSigning = connectionState === "signing";

  return (
    <main className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/80 shadow-sm">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Sign In to OrbitPayroll</CardTitle>
          <CardDescription>
            Connect your wallet and sign a message to authenticate
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Connect Wallet */}
          <div className="flex items-start gap-4">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isConnected
                  ? "bg-green-500/20 text-green-500"
                  : "bg-primary/20 text-primary"
              }`}
            >
              {isConnected ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <span className="text-sm font-medium">1</span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-1">Connect Wallet</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {isConnected
                  ? `Connected: ${formatAddress(address || "")}`
                  : "Choose your preferred wallet to connect"}
              </p>
              {!isConnected && <ConnectButton />}
            </div>
          </div>

          {/* Step 2: Sign Message */}
          <div className="flex items-start gap-4">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isAuthenticated
                  ? "bg-green-500/20 text-green-500"
                  : isConnected
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isAuthenticated ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <span className="text-sm font-medium">2</span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-1">Sign Message</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {isAuthenticated
                  ? "Successfully authenticated!"
                  : "Sign a message to verify wallet ownership"}
              </p>
              {isConnected && !isAuthenticated && (
                <Button
                  onClick={handleSignIn}
                  disabled={isSigning}
                  className="w-full"
                >
                  {isSigning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Waiting for signature...
                    </>
                  ) : (
                    <>
                      Sign Message
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Error Display */}
          {(authError || error) && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Authentication Failed</p>
                <p className="text-sm mt-1">
                  {authError || (error instanceof Error ? error.message : "An error occurred")}
                </p>
              </div>
            </div>
          )}

          {/* Signing Instructions */}
          {isSigning && (
            <div className="p-4 rounded-lg bg-muted border border-border">
              <h4 className="font-medium text-sm mb-2">Signing Instructions</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Check your wallet for a signature request</li>
                <li>• Review the message to ensure it&apos;s from OrbitPayroll</li>
                <li>• Click &quot;Sign&quot; to complete authentication</li>
              </ul>
            </div>
          )}

          {/* Back to Home */}
          <div className="text-center pt-4 border-t">
            <Button
              variant="link"
              onClick={() => router.push("/")}
              className="text-muted-foreground"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
