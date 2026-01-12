import { ethers, network } from "hardhat";
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
      deploymentTx: string;
      blockNumber: number;
    };
    MockMNEE?: {
      address: string;
      deploymentTx: string;
      blockNumber: number;
    };
  };
  timestamp: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log("=".repeat(60));
  console.log("OrbitPayroll Smart Contract Deployment");
  console.log("=".repeat(60));
  console.log(`Network: ${networkName} (chainId: ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("=".repeat(60));

  let mneeTokenAddress = MNEE_TOKEN_ADDRESS;
  let mockMneeDeployment: DeploymentResult["contracts"]["MockMNEE"] | undefined;

  // For local/hardhat networks, deploy MockMNEE
  if (networkName === "hardhat" || networkName === "localhost") {
    console.log("\n📦 Deploying MockMNEE token for local testing...");
    const MockMNEE = await ethers.getContractFactory("MockMNEE");
    const mockMnee = await MockMNEE.deploy("Mock MNEE", "MNEE", 18);
    await mockMnee.waitForDeployment();
    
    const mockMneeAddress = await mockMnee.getAddress();
    const deployTx = mockMnee.deploymentTransaction();
    const receipt = await deployTx?.wait();
    
    mneeTokenAddress = mockMneeAddress;
    mockMneeDeployment = {
      address: mockMneeAddress,
      deploymentTx: deployTx?.hash || "",
      blockNumber: receipt?.blockNumber || 0,
    };
    
    console.log(`✅ MockMNEE deployed at: ${mockMneeAddress}`);
    
    // Mint some tokens to deployer for testing
    const mintAmount = ethers.parseEther("1000000");
    await mockMnee.mint(deployer.address, mintAmount);
    console.log(`✅ Minted ${ethers.formatEther(mintAmount)} MNEE to deployer`);
  }

  // Deploy PayrollTreasury
  console.log("\n📦 Deploying PayrollTreasury...");
  console.log(`   Admin: ${deployer.address}`);
  console.log(`   MNEE Token: ${mneeTokenAddress}`);
  
  const PayrollTreasury = await ethers.getContractFactory("PayrollTreasury");
  const treasury = await PayrollTreasury.deploy(deployer.address, mneeTokenAddress);
  await treasury.waitForDeployment();
  
  const treasuryAddress = await treasury.getAddress();
  const treasuryDeployTx = treasury.deploymentTransaction();
  const treasuryReceipt = await treasuryDeployTx?.wait();
  
  console.log(`✅ PayrollTreasury deployed at: ${treasuryAddress}`);
  console.log(`   Transaction: ${treasuryDeployTx?.hash}`);
  console.log(`   Block: ${treasuryReceipt?.blockNumber}`);
  console.log(`   Gas used: ${treasuryReceipt?.gasUsed.toString()}`);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const admin = await treasury.getAdmin();
  const mneeToken = await treasury.mneeToken();
  console.log(`   Admin: ${admin}`);
  console.log(`   MNEE Token: ${mneeToken}`);
  
  if (admin !== deployer.address) {
    throw new Error("Admin address mismatch!");
  }
  if (mneeToken.toLowerCase() !== mneeTokenAddress.toLowerCase()) {
    throw new Error("MNEE token address mismatch!");
  }
  console.log("✅ Deployment verified successfully!");

  // Prepare deployment result
  const deploymentResult: DeploymentResult = {
    network: networkName,
    chainId,
    deployer: deployer.address,
    contracts: {
      PayrollTreasury: {
        address: treasuryAddress,
        admin: deployer.address,
        mneeToken: mneeTokenAddress,
        deploymentTx: treasuryDeployTx?.hash || "",
        blockNumber: treasuryReceipt?.blockNumber || 0,
      },
    },
    timestamp: new Date().toISOString(),
  };

  if (mockMneeDeployment) {
    deploymentResult.contracts.MockMNEE = mockMneeDeployment;
  }

  // Save deployment result to JSON
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentResult, null, 2));
  console.log(`\n📄 Deployment saved to: ${deploymentFile}`);

  // Also save addresses.json for easy import
  const addressesFile = path.join(deploymentsDir, "addresses.json");
  let addresses: Record<string, Record<string, string>> = {};
  
  if (fs.existsSync(addressesFile)) {
    addresses = JSON.parse(fs.readFileSync(addressesFile, "utf-8"));
  }
  
  addresses[networkName] = {
    PayrollTreasury: treasuryAddress,
    MNEE: mneeTokenAddress,
  };
  
  fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 2));
  console.log(`📄 Addresses saved to: ${addressesFile}`);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network: ${networkName}`);
  console.log(`PayrollTreasury: ${treasuryAddress}`);
  console.log(`MNEE Token: ${mneeTokenAddress}`);
  console.log("=".repeat(60));

  return deploymentResult;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
