import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { PayrollTreasury, MockMNEE } from "../typechain-types";

/**
 * Property-Based Tests for PayrollTreasury
 * 
 * These tests validate correctness properties using randomized inputs
 * to ensure the contract behaves correctly across a wide range of scenarios.
 */
describe("PayrollTreasury Property Tests", function () {
  // Number of iterations for property tests
  const PROPERTY_TEST_ITERATIONS = 100;

  // Helper to generate random BigInt within range
  function randomBigInt(min: bigint, max: bigint): bigint {
    const range = max - min;
    const randomBytes = ethers.randomBytes(32);
    const randomValue = BigInt("0x" + Buffer.from(randomBytes).toString("hex"));
    return min + (randomValue % (range + 1n));
  }

  // Helper to generate random address
  function randomAddress(): string {
    return ethers.Wallet.createRandom().address;
  }

  // Fixture to deploy contracts for each test
  async function deployTreasuryFixture() {
    const [admin, user1, user2, user3] = await ethers.getSigners();

    // Deploy MockMNEE token
    const MockMNEE = await ethers.getContractFactory("MockMNEE");
    const mnee = await MockMNEE.deploy("Mock MNEE", "MNEE", 18);
    await mnee.waitForDeployment();

    // Deploy PayrollTreasury
    const PayrollTreasury = await ethers.getContractFactory("PayrollTreasury");
    const treasury = await PayrollTreasury.deploy(admin.address, await mnee.getAddress());
    await treasury.waitForDeployment();

    return { treasury, mnee, admin, user1, user2, user3 };
  }

  // ============ Property 2: Deposit Round-Trip ============
  // **Feature: smart-contracts, Property 2: Deposit Round-Trip**
  // **Validates: Requirements 2.1, 2.5**
  describe("Property 2: Deposit Round-Trip", function () {
    it("For any deposit of amount X with sufficient allowance, treasury balance SHALL increase by exactly X AND depositor balance SHALL decrease by exactly X", async function () {
      const { treasury, mnee, admin } = await loadFixture(deployTreasuryFixture);
      const treasuryAddress = await treasury.getAddress();

      // Mint a large amount to admin for testing
      const maxMintAmount = ethers.parseEther("1000000");
      await mnee.mint(admin.address, maxMintAmount);

      for (let i = 0; i < PROPERTY_TEST_ITERATIONS; i++) {
        // Generate random deposit amount between 1 wei and 10000 MNEE
        const minAmount = 1n;
        const maxAmount = ethers.parseEther("10000");
        const depositAmount = randomBigInt(minAmount, maxAmount);

        // Record balances before deposit
        const treasuryBalanceBefore = await treasury.getBalance();
        const depositorBalanceBefore = await mnee.balanceOf(admin.address);

        // Approve and deposit
        await mnee.connect(admin).approve(treasuryAddress, depositAmount);
        await treasury.connect(admin).deposit(depositAmount);

        // Record balances after deposit
        const treasuryBalanceAfter = await treasury.getBalance();
        const depositorBalanceAfter = await mnee.balanceOf(admin.address);

        // Property assertions
        expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(
          depositAmount,
          `Iteration ${i}: Treasury balance should increase by exactly ${depositAmount}`
        );
        expect(depositorBalanceBefore - depositorBalanceAfter).to.equal(
          depositAmount,
          `Iteration ${i}: Depositor balance should decrease by exactly ${depositAmount}`
        );
      }
    });
  });

  // ============ Property 9: Payroll Distribution Correctness ============
  // **Feature: smart-contracts, Property 9: Payroll Distribution Correctness**
  // **Validates: Requirements 4.10**
  describe("Property 9: Payroll Distribution Correctness", function () {
    it("For any successful runPayroll execution, each recipient R[i] SHALL receive exactly A[i] MNEE tokens AND treasury balance SHALL decrease by sum(A)", async function () {
      const { treasury, mnee, admin } = await loadFixture(deployTreasuryFixture);
      const treasuryAddress = await treasury.getAddress();

      for (let i = 0; i < PROPERTY_TEST_ITERATIONS; i++) {
        // Generate random number of recipients (1 to 10)
        const numRecipients = Number(randomBigInt(1n, 10n));
        
        // Generate random recipients and amounts
        const recipients: string[] = [];
        const amounts: bigint[] = [];
        let totalAmount = 0n;

        for (let j = 0; j < numRecipients; j++) {
          recipients.push(randomAddress());
          // Random amount between 1 wei and 100 MNEE
          const amount = randomBigInt(1n, ethers.parseEther("100"));
          amounts.push(amount);
          totalAmount += amount;
        }

        // Fund treasury with enough tokens
        await mnee.mint(admin.address, totalAmount);
        await mnee.connect(admin).approve(treasuryAddress, totalAmount);
        await treasury.connect(admin).deposit(totalAmount);

        // Record balances before payroll
        const treasuryBalanceBefore = await treasury.getBalance();
        const recipientBalancesBefore: bigint[] = [];
        for (const recipient of recipients) {
          recipientBalancesBefore.push(await mnee.balanceOf(recipient));
        }

        // Execute payroll
        const runId = ethers.id(`property-test-run-${i}`);
        await treasury.connect(admin).runPayroll(recipients, amounts, runId);

        // Record balances after payroll
        const treasuryBalanceAfter = await treasury.getBalance();

        // Property assertions
        // 1. Treasury balance should decrease by total amount
        expect(treasuryBalanceBefore - treasuryBalanceAfter).to.equal(
          totalAmount,
          `Iteration ${i}: Treasury balance should decrease by exactly ${totalAmount}`
        );

        // 2. Each recipient should receive exactly their amount
        for (let j = 0; j < numRecipients; j++) {
          const recipientBalanceAfter = await mnee.balanceOf(recipients[j]);
          expect(recipientBalanceAfter - recipientBalancesBefore[j]).to.equal(
            amounts[j],
            `Iteration ${i}, Recipient ${j}: Should receive exactly ${amounts[j]}`
          );
        }
      }
    });
  });

  // ============ Property 17: Total Conservation ============
  // **Feature: smart-contracts, Property 17: Total Conservation**
  // **Validates: Requirements 4.10, 6.2**
  describe("Property 17: Total Conservation", function () {
    // Reduced iterations due to contract deployment overhead per iteration
    const CONSERVATION_TEST_ITERATIONS = 25;

    it("For any sequence of deposits D and payrolls P and withdrawals W, the final treasury balance SHALL equal sum(D) - sum(P) - sum(W)", async function () {
      this.timeout(120000); // Extend timeout for this test

      for (let i = 0; i < CONSERVATION_TEST_ITERATIONS; i++) {
        // Deploy fresh contracts for each iteration to ensure clean state
        const [admin] = await ethers.getSigners();
        
        const MockMNEE = await ethers.getContractFactory("MockMNEE");
        const mnee = await MockMNEE.deploy("Mock MNEE", "MNEE", 18);
        await mnee.waitForDeployment();

        const PayrollTreasury = await ethers.getContractFactory("PayrollTreasury");
        const treasury = await PayrollTreasury.deploy(admin.address, await mnee.getAddress());
        await treasury.waitForDeployment();
        const treasuryAddress = await treasury.getAddress();

        // Track totals
        let totalDeposits = 0n;
        let totalPayrolls = 0n;
        let totalWithdrawals = 0n;

        // Generate random sequence of operations (2-5 operations)
        const numOperations = Number(randomBigInt(2n, 5n));

        for (let op = 0; op < numOperations; op++) {
          // Randomly choose operation type: 0=deposit, 1=payroll, 2=withdrawal
          const opType = Number(randomBigInt(0n, 2n));
          const currentBalance = await treasury.getBalance();

          if (opType === 0) {
            // Deposit
            const depositAmount = randomBigInt(1n, ethers.parseEther("100"));
            await mnee.mint(admin.address, depositAmount);
            await mnee.connect(admin).approve(treasuryAddress, depositAmount);
            await treasury.connect(admin).deposit(depositAmount);
            totalDeposits += depositAmount;
          } else if (opType === 1 && currentBalance > 0n) {
            // Payroll (only if treasury has balance)
            const numRecipients = Number(randomBigInt(1n, 3n));
            const recipients: string[] = [];
            const amounts: bigint[] = [];
            let payrollTotal = 0n;

            // Ensure payroll doesn't exceed balance
            const maxPerRecipient = currentBalance / BigInt(numRecipients);
            if (maxPerRecipient > 0n) {
              for (let j = 0; j < numRecipients; j++) {
                recipients.push(randomAddress());
                const amount = randomBigInt(1n, maxPerRecipient);
                amounts.push(amount);
                payrollTotal += amount;
              }

              if (payrollTotal <= currentBalance) {
                const runId = ethers.id(`conservation-test-${i}-${op}`);
                await treasury.connect(admin).runPayroll(recipients, amounts, runId);
                totalPayrolls += payrollTotal;
              }
            }
          } else if (opType === 2 && currentBalance > 0n) {
            // Emergency withdrawal (only if treasury has balance)
            const withdrawAmount = randomBigInt(1n, currentBalance);
            const recipient = randomAddress();
            await treasury.connect(admin).emergencyWithdraw(withdrawAmount, recipient);
            totalWithdrawals += withdrawAmount;
          }
        }

        // Property assertion: final balance = deposits - payrolls - withdrawals
        const finalBalance = await treasury.getBalance();
        const expectedBalance = totalDeposits - totalPayrolls - totalWithdrawals;

        expect(finalBalance).to.equal(
          expectedBalance,
          `Iteration ${i}: Final balance ${finalBalance} should equal deposits(${totalDeposits}) - payrolls(${totalPayrolls}) - withdrawals(${totalWithdrawals}) = ${expectedBalance}`
        );
      }
    });
  });
});
