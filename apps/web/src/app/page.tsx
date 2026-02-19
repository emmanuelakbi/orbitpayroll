"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/auth";
import { useAuth } from "@/lib/auth";
import { Users, Wallet, Clock, Shield, Zap, Globe } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">OP</span>
          </div>
          <span className="font-semibold text-lg">OrbitPayroll</span>
        </div>
          <ConnectButton />
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm mb-6">
          <Zap className="w-4 h-4" />
          <span>Built for MNEE Hackathon</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
          MNEE-Native Payroll for the{" "}
          <span className="text-primary">Web3 Era</span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Streamline contractor payments with blockchain-powered batch payroll. 
          Manage your team, fund your treasury, and execute payments—all in MNEE.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <ConnectButton className="min-w-[200px] h-12 text-base" />
          <Button
            variant="outline"
            size="lg"
            className="min-w-[200px] h-12 text-base"
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
          >
            Learn More
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
          Everything You Need for Web3 Payroll
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          OrbitPayroll combines the simplicity of traditional payroll with the power of blockchain technology.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Contractor Management"
            description="Add and manage contractors with configurable pay rates and cycles. Track your entire team in one place."
          />
          <FeatureCard
            icon={<Wallet className="w-6 h-6" />}
            title="Treasury Control"
            description="Fund your organization's treasury with MNEE tokens. Monitor balances and ensure sufficient funds for payroll."
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="Batch Payments"
            description="Execute payroll for all contractors in a single transaction. Save on gas and reduce complexity."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Secure by Design"
            description="Smart contract-based payments with full transparency. Every transaction is verifiable on-chain."
          />
          <FeatureCard
            icon={<Clock className="w-6 h-6" />}
            title="Flexible Pay Cycles"
            description="Support for weekly, bi-weekly, and monthly payment schedules. Adapt to your organization's needs."
          />
          <FeatureCard
            icon={<Globe className="w-6 h-6" />}
            title="MNEE Integration"
            description="Native support for MNEE token payments. Leverage the stability and efficiency of the MNEE ecosystem."
          />
        </div>
      </section>

      {/* MNEE Hackathon Section */}
      <section className="container mx-auto px-4 pb-16">
        <Card className="border-primary/20 bg-muted/30">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl">
              Built for the MNEE Ecosystem
            </CardTitle>
            <CardDescription className="text-base max-w-2xl mx-auto">
              OrbitPayroll is designed specifically for MNEE token payments, 
              providing organizations with a seamless way to manage contractor compensation 
              in the growing MNEE ecosystem.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
              <StatCard value="Fast" label="Transaction Settlement" />
              <StatCard value="Low" label="Gas Fees" />
              <StatCard value="100%" label="On-Chain Transparency" />
            </div>
            <ConnectButton className="mt-4" />
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">OP</span>
            </div>
            <span className="text-sm text-muted-foreground">
              OrbitPayroll © 2026
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Built for the MNEE Hackathon</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
          {icon}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center p-4 rounded-lg bg-background">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
