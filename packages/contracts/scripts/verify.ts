import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// MNEE Token address on mainnet/testnet
const MNEE_TOKEN_ADDRESS = process.env.MNEE_TOKEN_ADDRESS || "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFB6cF";

interface DeploymentResult {
  network: string;
  chainId: number;
  deployer: string;
  contracts: {
    PayrollTreasury: {
      address: string;
      admin: string;
      mneeToken: string;
    };
  };
}

async function main() {
  const networkName = process.env.HARDHAT_NETWORK || "sepolia";
  
  console.log("=".repeat(60));
  console.log("OrbitPayroll Contract Verification");
  console.log("=".repeat(60));
  console.log(`Network: ${networkName}`);

  // Load deployment data
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);

  if (!fs.existsSync(deploymentFile)) {
    console.error(`❌ Deployment file not found: ${deploymentFile}`);
    console.error(`   Please deploy to ${networkName} first using: npm run deploy:${networkName}`);
    process.exit(1);
  }

  const deployment: DeploymentResult = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  const { PayrollTreasury } = deployment.contracts;

  console.log(`\n📋 Contract to verify:`);
  console.log(`   PayrollTreasury: ${PayrollTreasury.address}`);
  console.log(`   Admin: ${PayrollTreasury.admin}`);
  console.log(`   MNEE Token: ${PayrollTreasury.mneeToken}`);

  // Verify PayrollTreasury
  console.log("\n🔍 Verifying PayrollTreasury on Etherscan...");
  
  try {
    await run("verify:verify", {
      address: PayrollTreasury.address,
      constructorArguments: [
        PayrollTreasury.admin,
        PayrollTreasury.mneeToken,
      ],
    });
    console.log("✅ PayrollTreasury verified successfully!");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ PayrollTreasury is already verified!");
    } else {
      console.error("❌ Verification failed:", error.message);
      throw error;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("VERIFICATION COMPLETE");
  console.log("=".repeat(60));
  console.log(`View on Etherscan:`);
  
  const explorerUrl = networkName === "mainnet" 
    ? "https://etherscan.io" 
    : `https://${networkName}.etherscan.io`;
  
  console.log(`   ${explorerUrl}/address/${PayrollTreasury.address}#code`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });
