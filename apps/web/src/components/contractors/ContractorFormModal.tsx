"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Contractor, ContractorInput, PayCycle } from "@/lib/api/types";
import { AlertCircle, Loader2 } from "lucide-react";

interface ContractorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractor?: Contractor;
  onSubmit: (data: ContractorInput) => Promise<void>;
  isSubmitting: boolean;
  error?: Error | null;
}

interface FormErrors {
  name?: string;
  walletAddress?: string;
  rateAmount?: string;
  rateCurrency?: string;
  payCycle?: string;
}

const PAY_CYCLE_OPTIONS = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

const CURRENCY_OPTIONS = [
  { value: "MNEE", label: "MNEE" },
];

/**
 * Validate Ethereum wallet address format
 */
export function isValidWalletAddress(address: string): boolean {
  // Check if it's a valid Ethereum address format (0x followed by 40 hex characters)
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate rate amount is a positive number
 */
export function isValidRateAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && isFinite(num);
}

/**
 * Convert rate amount to wei string (18 decimals)
 */
function rateToWei(amount: string): string {
  const num = parseFloat(amount);
  // Convert to wei (18 decimals)
  const wei = BigInt(Math.floor(num * 1e18));
  return wei.toString();
}

/**
 * Convert wei string to display amount
 */
function weiToRate(wei: string): string {
  const value = BigInt(wei);
  const divisor = BigInt(1e18);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;
  const fractionalStr = fractionalPart.toString().padStart(18, "0").slice(0, 2);
  return `${integerPart}.${fractionalStr}`;
}

export function ContractorFormModal({
  isOpen,
  onClose,
  contractor,
  onSubmit,
  isSubmitting,
  error,
}: ContractorFormModalProps) {
  const isEditing = !!contractor;

  // Form state
  const [name, setName] = React.useState("");
  const [walletAddress, setWalletAddress] = React.useState("");
  const [rateAmount, setRateAmount] = React.useState("");
  const [rateCurrency, setRateCurrency] = React.useState("MNEE");
  const [payCycle, setPayCycle] = React.useState<PayCycle>("MONTHLY");
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  // Reset form when modal opens/closes or contractor changes
  React.useEffect(() => {
    if (isOpen) {
      if (contractor) {
        setName(contractor.name);
        setWalletAddress(contractor.walletAddress);
        setRateAmount(weiToRate(contractor.rateAmount));
        setRateCurrency(contractor.rateCurrency);
        setPayCycle(contractor.payCycle);
      } else {
        setName("");
        setWalletAddress("");
        setRateAmount("");
        setRateCurrency("MNEE");
        setPayCycle("MONTHLY");
      }
      setErrors({});
      setTouched({});
    }
  }, [isOpen, contractor]);

  // Validate a single field
  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case "name":
        if (!value.trim()) return "Name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        return undefined;

      case "walletAddress":
        if (!value.trim()) return "Wallet address is required";
        if (!isValidWalletAddress(value)) {
          return "Invalid wallet address format (must be 0x followed by 40 hex characters)";
        }
        return undefined;

      case "rateAmount":
        if (!value.trim()) return "Rate amount is required";
        if (!isValidRateAmount(value)) {
          return "Rate must be a positive number";
        }
        return undefined;

      default:
        return undefined;
    }
  };

  // Handle field blur for validation
  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    
    let value = "";
    switch (field) {
      case "name":
        value = name;
        break;
      case "walletAddress":
        value = walletAddress;
        break;
      case "rateAmount":
        value = rateAmount;
        break;
    }

    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  // Handle field change with immediate validation for touched fields
  const handleChange = (field: string, value: string) => {
    switch (field) {
      case "name":
        setName(value);
        break;
      case "walletAddress":
        setWalletAddress(value);
        break;
      case "rateAmount":
        setRateAmount(value);
        break;
    }

    // Only validate if field has been touched
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      name: validateField("name", name),
      walletAddress: validateField("walletAddress", walletAddress),
      rateAmount: validateField("rateAmount", rateAmount),
    };

    setErrors(newErrors);
    setTouched({ name: true, walletAddress: true, rateAmount: true });

    return !Object.values(newErrors).some((error) => error !== undefined);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const data: ContractorInput = {
      name: name.trim(),
      walletAddress: walletAddress.trim(),
      rateAmount: rateToWei(rateAmount),
      rateCurrency,
      payCycle,
    };

    await onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Contractor" : "Add Contractor"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the contractor's information"
              : "Add a new contractor to your organization"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder="John Doe"
              className={errors.name && touched.name ? "border-destructive" : ""}
            />
            {errors.name && touched.name && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Wallet Address Field */}
          <div className="space-y-2">
            <Label htmlFor="walletAddress">Wallet Address</Label>
            <Input
              id="walletAddress"
              value={walletAddress}
              onChange={(e) => handleChange("walletAddress", e.target.value)}
              onBlur={() => handleBlur("walletAddress")}
              placeholder="0x..."
              className={errors.walletAddress && touched.walletAddress ? "border-destructive" : ""}
            />
            {errors.walletAddress && touched.walletAddress && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.walletAddress}
              </p>
            )}
          </div>

          {/* Rate Amount Field */}
          <div className="space-y-2">
            <Label htmlFor="rateAmount">Rate Amount</Label>
            <div className="flex gap-2">
              <Input
                id="rateAmount"
                type="text"
                inputMode="decimal"
                value={rateAmount}
                onChange={(e) => handleChange("rateAmount", e.target.value)}
                onBlur={() => handleBlur("rateAmount")}
                placeholder="1000.00"
                className={errors.rateAmount && touched.rateAmount ? "border-destructive flex-1" : "flex-1"}
              />
              <Select
                value={rateCurrency}
                onChange={(e) => setRateCurrency(e.target.value)}
                options={CURRENCY_OPTIONS}
                className="w-24"
              />
            </div>
            {errors.rateAmount && touched.rateAmount && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.rateAmount}
              </p>
            )}
          </div>

          {/* Pay Cycle Field */}
          <div className="space-y-2">
            <Label htmlFor="payCycle">Pay Cycle</Label>
            <Select
              id="payCycle"
              value={payCycle}
              onChange={(e) => setPayCycle(e.target.value as PayCycle)}
              options={PAY_CYCLE_OPTIONS}
            />
          </div>

          {/* API Error */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error.message || "An error occurred. Please try again."}
              </p>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Contractor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
