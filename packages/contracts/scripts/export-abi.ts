import * as fs from "fs";
import * as path from "path";

/**
 * Export ABIs and addresses for frontend/backend consumption
 * This script extracts the ABI from compiled artifacts and combines
 * them with deployment addresses into a single export file.
 */

interface ContractExport {
  abi: any[];
  addresses: Record<string, string>;
}

interface ExportResult {
  PayrollTreasury: ContractExport;
  MNEE: {
    addresses: Record<string, string>;
  };
  generatedAt: string;
}

async function main() {
  console.log("=".repeat(60));
  console.log("OrbitPayroll ABI Export");
  console.log("=".repeat(60));

  const artifactsDir = path.join(__dirname, "..", "artifacts", "contracts");
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const exportDir = path.join(__dirname, "..", "exports");

  // Create export directory
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  // Load PayrollTreasury ABI
  const treasuryArtifactPath = path.join(
    artifactsDir,
    "PayrollTreasury.sol",
    "PayrollTreasury.json"
  );

  if (!fs.existsSync(treasuryArtifactPath)) {
    console.error("❌ PayrollTreasury artifact not found. Run 'npm run compile' first.");
    process.exit(1);
  }

  const treasuryArtifact = JSON.parse(fs.readFileSync(treasuryArtifactPath, "utf-8"));
  console.log("✅ Loaded PayrollTreasury ABI");

  // Load addresses from deployments
  const addressesPath = path.join(deploymentsDir, "addresses.json");
  let addresses: Record<string, Record<string, string>> = {};

  if (fs.existsSync(addressesPath)) {
    addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));
    console.log("✅ Loaded deployment addresses");
  } else {
    console.log("⚠️  No deployment addresses found. Export will contain empty addresses.");
  }

  // Build address maps
  const treasuryAddresses: Record<string, string> = {};
  const mneeAddresses: Record<string, string> = {};

  for (const [network, contracts] of Object.entries(addresses)) {
    if (contracts.PayrollTreasury) {
      treasuryAddresses[network] = contracts.PayrollTreasury;
    }
    if (contracts.MNEE) {
      mneeAddresses[network] = contracts.MNEE;
    }
  }

  // Add mainnet MNEE address (known address)
  mneeAddresses["mainnet"] = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFB6cF";

  // Create export result
  const exportResult: ExportResult = {
    PayrollTreasury: {
      abi: treasuryArtifact.abi,
      addresses: treasuryAddresses,
    },
    MNEE: {
      addresses: mneeAddresses,
    },
    generatedAt: new Date().toISOString(),
  };

  // Write combined export
  const exportPath = path.join(exportDir, "contracts.json");
  fs.writeFileSync(exportPath, JSON.stringify(exportResult, null, 2));
  console.log(`\n📄 Combined export saved to: ${exportPath}`);

  // Write individual ABI file
  const abiPath = path.join(exportDir, "PayrollTreasury.abi.json");
  fs.writeFileSync(abiPath, JSON.stringify(treasuryArtifact.abi, null, 2));
  console.log(`📄 ABI saved to: ${abiPath}`);

  // Write TypeScript types for addresses
  const tsContent = `// Auto-generated contract addresses
// Generated at: ${new Date().toISOString()}

export const PAYROLL_TREASURY_ADDRESSES: Record<string, string> = ${JSON.stringify(treasuryAddresses, null, 2)};

export const MNEE_ADDRESSES: Record<string, string> = ${JSON.stringify(mneeAddresses, null, 2)};

export function getPayrollTreasuryAddress(network: string): string | undefined {
  return PAYROLL_TREASURY_ADDRESSES[network];
}

export function getMneeAddress(network: string): string | undefined {
  return MNEE_ADDRESSES[network];
}
`;

  const tsPath = path.join(exportDir, "addresses.ts");
  fs.writeFileSync(tsPath, tsContent);
  console.log(`📄 TypeScript addresses saved to: ${tsPath}`);

  console.log("\n" + "=".repeat(60));
  console.log("EXPORT COMPLETE");
  console.log("=".repeat(60));
  console.log("Files generated:");
  console.log(`  - ${exportPath}`);
  console.log(`  - ${abiPath}`);
  console.log(`  - ${tsPath}`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Export failed:", error);
    process.exit(1);
  });
