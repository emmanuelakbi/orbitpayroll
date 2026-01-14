"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth";
import { useDashboard } from "@/components/dashboard";
import { Settings, Building2, Wallet, Copy, Check, ExternalLink } from "lucide-react";

export default function SettingsPage() {
  const { user } = useSession();
  const { currentOrg } = useDashboard();
  const [copied, setCopied] = React.useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          Manage your account and organization settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>Your wallet and account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wallet">Wallet Address</Label>
              <div className="flex gap-2">
                <Input
                  id="wallet"
                  value={user?.walletAddress || ""}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => user?.walletAddress && copyToClipboard(user.walletAddress, "wallet")}
                  aria-label="Copy wallet address"
                >
                  {copied === "wallet" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                {user?.walletAddress && (
                  <Button variant="outline" size="icon" asChild>
                    <a
                      href={`https://sepolia.etherscan.io/address/${user.walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="View on Etherscan"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization Settings */}
        {currentOrg && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization
              </CardTitle>
              <CardDescription>Current organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input id="orgName" value={currentOrg.name} readOnly />
              </div>

              <div className="space-y-2">
                <Label htmlFor="treasury">Treasury Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="treasury"
                    value={currentOrg.treasuryAddress || "Not set"}
                    readOnly
                    className="font-mono text-sm"
                  />
                  {currentOrg.treasuryAddress && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(currentOrg.treasuryAddress!, "treasury")}
                        aria-label="Copy treasury address"
                      >
                        {copied === "treasury" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <a
                          href={`https://sepolia.etherscan.io/address/${currentOrg.treasuryAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="View on Etherscan"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgId">Organization ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="orgId"
                    value={currentOrg.id}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(currentOrg.id, "orgId")}
                    aria-label="Copy organization ID"
                  >
                    {copied === "orgId" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Network Info */}
        <Card>
          <CardHeader>
            <CardTitle>Network</CardTitle>
            <CardDescription>Blockchain network configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Sepolia Testnet</p>
                <p className="text-sm text-muted-foreground">Chain ID: 11155111</p>
              </div>
              <div className="h-3 w-3 rounded-full bg-yellow-500" title="Testnet" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
