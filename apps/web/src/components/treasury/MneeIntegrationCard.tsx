"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MNEE_ADDRESS } from "@/contracts/addresses";
import { getTokenUrl, getAddressUrl } from "@/lib/explorer";
import { formatAddress } from "@/lib/auth";
import { 
  ExternalLink, 
  Copy, 
  Check, 
  Coins, 
  Zap, 
  Globe, 
  Shield,
  Clock
} from "lucide-react";

/**
 * MNEE Integration Showcase Card
 * 
 * Displays MNEE token integration details for hackathon judges:
 * - Contract address with copy and Etherscan link
 * - Key benefits of using MNEE for payroll
 * - Integration highlights
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */
export function MneeIntegrationCard() {
  const [copied, setCopied] = React.useState(false);

  const handleCopyAddress = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(MNEE_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  }, []);

  const benefits = [
    {
      icon: <Globe className="h-4 w-4" aria-hidden="true" />,
      title: "Global Payments",
      description: "Pay contractors anywhere in the world instantly",
    },
    {
      icon: <Zap className="h-4 w-4" aria-hidden="true" />,
      title: "Batch Transfers",
      description: "Execute multiple payments in a single transaction",
    },
    {
      icon: <Shield className="h-4 w-4" aria-hidden="true" />,
      title: "Non-Custodial",
      description: "Organizations maintain full control of their treasury",
    },
    {
      icon: <Clock className="h-4 w-4" aria-hidden="true" />,
      title: "Instant Settlement",
      description: "No waiting for bank transfers or payment processing",
    },
  ];

  return (
    <Card className="border-2 border-primary/20 bg-muted/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" aria-hidden="true" />
            <CardTitle className="text-lg">MNEE Integration</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Programmable Money
          </Badge>
        </div>
        <CardDescription>
          OrbitPayroll uses MNEE stablecoin for all payroll operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contract Address Section */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            MNEE Token Contract
          </h4>
          <div className="flex flex-col gap-2 p-3 bg-muted rounded-lg sm:flex-row sm:items-center">
            <code 
              className="text-sm font-mono break-all flex-1"
              aria-label={`MNEE contract address: ${MNEE_ADDRESS}`}
            >
              {MNEE_ADDRESS}
            </code>
            <div className="flex gap-1 mt-2 sm:mt-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={handleCopyAddress}
                aria-label={copied ? "Address copied" : "Copy MNEE contract address"}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                asChild
              >
                <a
                  href={getTokenUrl(MNEE_ADDRESS)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View MNEE token on Etherscan (opens in new tab)"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Verified on{" "}
            <a
              href={getAddressUrl(MNEE_ADDRESS)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Etherscan
            </a>
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Why MNEE for Payroll?
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="flex items-start gap-3 p-3 rounded-lg bg-background border"
              >
                <div className="p-2 rounded-full bg-primary/10 text-primary flex-shrink-0">
                  {benefit.icon}
                </div>
                <div>
                  <p className="font-medium text-sm">{benefit.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration Highlights */}
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-medium text-muted-foreground">
            Integration Highlights
          </h4>
          <ul className="space-y-1 text-sm">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
              <span>ERC-20 compliant token transfers</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
              <span>Smart contract treasury management</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
              <span>On-chain payroll execution with event logging</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
              <span>Transparent transaction history on block explorer</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact MNEE badge for displaying in headers or cards
 */
export function MneeBadge() {
  return (
    <a
      href={getTokenUrl(MNEE_ADDRESS)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
      aria-label="View MNEE token on Etherscan (opens in new tab)"
    >
      <Coins className="h-3 w-3" aria-hidden="true" />
      <span>MNEE</span>
      <span className="font-mono text-[10px] opacity-70">
        {formatAddress(MNEE_ADDRESS)}
      </span>
      <ExternalLink className="h-3 w-3 opacity-50" aria-hidden="true" />
    </a>
  );
}
