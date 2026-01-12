import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format MNEE amount for display (assumes 18 decimals)
 */
export function formatMnee(amount: string | bigint): string {
  const value = typeof amount === "string" ? BigInt(amount) : amount;
  const decimals = 18;
  const divisor = BigInt(10 ** decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;
  
  // Format with 2 decimal places
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0").slice(0, 2);
  
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(`${integerPart}.${fractionalStr}`));
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

/**
 * Format date for display (date only)
 */
export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(date));
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerUrl(
  txHash: string,
  network: "mainnet" | "sepolia" = "sepolia"
): string {
  const base =
    network === "mainnet"
      ? "https://etherscan.io"
      : "https://sepolia.etherscan.io";
  return `${base}/tx/${txHash}`;
}
