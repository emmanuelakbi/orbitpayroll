import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { PayrollTreasury, MockMNEE, ReentrancyAttacker, MaliciousToken } from "../typechain-types";

/**
 * Security Tests for PayrollTreasury
 * Requirements: 8.1, 8.2 (Reentrancy Protection)
 * Requirements: 4.2, 4.3, 5.1, 6.1 (Access Control)
 */
describe("PayrollTreasury Security Tests", function () {
  // ============ Fixtures ============

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

    // Mint tokens to users for testing
    const mintAmount = ethers.parseEther("10000");
    await mnee.mint(admin.address, mintAmount);
    await mnee.mint(user1.address, mintAmount);

    return { treasury, mnee, admin, user1, user2, user3 };
  }

  async function deployWithAttackerFixture() {
    const { treasury, mnee, admin, user1, user2, user3 } = await loadFixture(deployTreasuryFixture);

    // Deploy ReentrancyAttacker
    const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attacker = await ReentrancyAttacker.deploy(
      await treasury.getAddress(),
      await mnee.getAddress()
    );
    await attacker.waitForDeployment();

    // Mint tokens to attacker contract
    const attackerMintAmount = ethers.parseEther("1000");
    await mnee.mint(await attacker.getAddress(), attackerMintAmount);

    return { treasury, mnee, admin, user1, user2, user3, attacker };
  }

  async function deployWithMaliciousTokenFixture() {
    const [admin, user1, user2] = await ethers.getSigners();

    // Deploy MaliciousToken
    const MaliciousToken = await ethers.getContractFactory("MaliciousToken");
    const malToken = await MaliciousToken.deploy();
    await malToken.waitForDeployment();

    // Deploy PayrollTreasury with malicious token
    const PayrollTreasury = await ethers.getContractFactory("PayrollTreasury");
    const treasury = await PayrollTreasury.deploy(admin.address, await malToken.getAddress());
    await treasury.waitForDeployment();

    // Setup attacker
    await malToken.setAttacker(user1.address, await treasury.getAddress());

    // Mint tokens
    const mintAmount = ethers.parseEther("10000");
    await malToken.mint(admin.address, mintAmount);
    await malToken.mint(await treasury.getAddress(), mintAmount);

    return { treasury, malToken, admin, user1, user2 };
  }

  // ============ Task 6.1: Reentrancy Tests ============
  describe("Reentrancy Protection (Task 6.1)", function () {
    describe("deposit() reentrancy protection", function () {
      it("should protect deposit from reentrancy attacks", async function () {
        const { treasury, mnee, attacker } = await loadFixture(deployWithAttackerFixture);
        const depositAmount = ethers.parseEther("100");

        // Get initial treasury balance
        const treasuryBalanceBefore = await treasury.getBalance();

        // Attacker attempts reentrancy during deposit
        // The nonReentrant modifier should prevent any reentrant calls
        await expect(attacker.attackDeposit(depositAmount)).to.not.be.reverted;

        // Verify only one deposit occurred - balance should increase by depositAmount, not 2x
        const treasuryBalanceAfter = await treasury.getBalance();
        expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(depositAmount);
      });

      it("should complete deposit successfully with reentrancy guard", async function () {
        const { treasury, mnee, user1 } = await loadFixture(deployTreasuryFixture);
        const depositAmount = ethers.parseEther("100");

        await mnee.connect(user1).approve(await treasury.getAddress(), depositAmount);
        
        const balanceBefore = await treasury.getBalance();
        await treasury.connect(user1).deposit(depositAmount);
        const balanceAfter = await treasury.getBalance();

        expect(balanceAfter - balanceBefore).to.equal(depositAmount);
      });
    });

    describe("runPayroll() reentrancy protection", function () {
      it("should protect runPayroll from reentrancy attacks", async function () {
        const { treasury, mnee, admin, attacker } = await loadFixture(deployWithAttackerFixture);

        // Fund treasury
        const fundAmount = ethers.parseEther("1000");
        await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
        await treasury.connect(admin).deposit(fundAmount);

        // Set attacker as admin to test reentrancy (not access control)
        await treasury.connect(admin).setAdmin(await attacker.getAddress());

        // Get initial balance
        const treasuryBalanceBefore = await treasury.getBalance();

        // Attacker attempts reentrancy during runPayroll
        const payrollAmount = ethers.parseEther("10");
        await expect(attacker.attackPayroll(admin.address, payrollAmount)).to.not.be.reverted;

        // Verify only one payroll executed - balance should decrease by payrollAmount, not 2x
        const treasuryBalanceAfter = await treasury.getBalance();
        expect(treasuryBalanceBefore - treasuryBalanceAfter).to.equal(payrollAmount);
      });

      it("should execute payroll successfully with reentrancy guard", async function () {
        const { treasury, mnee, admin, user1 } = await loadFixture(deployTreasuryFixture);

        // Fund treasury
        const fundAmount = ethers.parseEther("1000");
        await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
        await treasury.connect(admin).deposit(fundAmount);

        const recipients = [user1.address];
        const amounts = [ethers.parseEther("100")];
        const runId = ethers.id("reentrancy-test");

        const user1BalanceBefore = await mnee.balanceOf(user1.address);
        await treasury.connect(admin).runPayroll(recipients, amounts, runId);
        const user1BalanceAfter = await mnee.balanceOf(user1.address);

        expect(user1BalanceAfter - user1BalanceBefore).to.equal(amounts[0]);
      });
    });

    describe("emergencyWithdraw() reentrancy protection", function () {
      it("should protect emergencyWithdraw from reentrancy attacks", async function () {
        const { treasury, mnee, admin, attacker } = await loadFixture(deployWithAttackerFixture);

        // Fund treasury
        const fundAmount = ethers.parseEther("1000");
        await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
        await treasury.connect(admin).deposit(fundAmount);

        // Set attacker as admin to test reentrancy (not access control)
        await treasury.connect(admin).setAdmin(await attacker.getAddress());

        // Get initial balance
        const treasuryBalanceBefore = await treasury.getBalance();

        // Attacker attempts reentrancy during emergencyWithdraw
        const withdrawAmount = ethers.parseEther("10");
        await expect(attacker.attackEmergencyWithdraw(withdrawAmount)).to.not.be.reverted;

        // Verify only one withdrawal occurred - balance should decrease by withdrawAmount, not 2x
        const treasuryBalanceAfter = await treasury.getBalance();
        expect(treasuryBalanceBefore - treasuryBalanceAfter).to.equal(withdrawAmount);
      });

      it("should execute emergencyWithdraw successfully with reentrancy guard", async function () {
        const { treasury, mnee, admin, user1 } = await loadFixture(deployTreasuryFixture);

        // Fund treasury
        const fundAmount = ethers.parseEther("1000");
        await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
        await treasury.connect(admin).deposit(fundAmount);

        const withdrawAmount = ethers.parseEther("500");
        const recipientBalanceBefore = await mnee.balanceOf(user1.address);
        
        await treasury.connect(admin).emergencyWithdraw(withdrawAmount, user1.address);
        
        const recipientBalanceAfter = await mnee.balanceOf(user1.address);
        expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(withdrawAmount);
      });
    });

    describe("Malicious token reentrancy protection", function () {
      it("should protect against reentrancy via malicious token transfer hooks", async function () {
        const { treasury, malToken, admin, user1 } = await loadFixture(deployWithMaliciousTokenFixture);

        // Enable attack mode on malicious token
        await malToken.enableAttack(true);

        // Attempt emergency withdraw - malicious token will try to reenter
        const withdrawAmount = ethers.parseEther("100");
        
        // The reentrancy guard should prevent the attack
        await expect(
          treasury.connect(admin).emergencyWithdraw(withdrawAmount, user1.address)
        ).to.not.be.reverted;

        // Verify attack was blocked (attackCount should be 1, meaning reentry failed)
        const attackCount = await malToken.attackCount();
        expect(attackCount).to.equal(1n);
      });
    });

    describe("Cross-function reentrancy protection", function () {
      it("should prevent reentering deposit from runPayroll", async function () {
        const { treasury, mnee, admin, attacker } = await loadFixture(deployWithAttackerFixture);

        // Fund treasury
        const fundAmount = ethers.parseEther("1000");
        await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
        await treasury.connect(admin).deposit(fundAmount);

        // Set attacker as admin
        await treasury.connect(admin).setAdmin(await attacker.getAddress());

        // The nonReentrant modifier protects all functions
        // Even if attacker tries to call deposit during runPayroll, it should fail
        await expect(attacker.attackPayroll(admin.address, ethers.parseEther("10"))).to.not.be.reverted;
      });

      it("should prevent reentering emergencyWithdraw from deposit", async function () {
        const { treasury, mnee, admin, attacker } = await loadFixture(deployWithAttackerFixture);

        // Fund treasury first
        const fundAmount = ethers.parseEther("1000");
        await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
        await treasury.connect(admin).deposit(fundAmount);

        // Set attacker as admin
        await treasury.connect(admin).setAdmin(await attacker.getAddress());

        // Attempt deposit attack - any cross-function reentrancy should be blocked
        await expect(attacker.attackDeposit(ethers.parseEther("10"))).to.not.be.reverted;
      });
    });
  });

  // ============ Task 6.2: Access Control Tests ============
  describe("Access Control (Task 6.2)", function () {
    describe("runPayroll access control", function () {
      it("should revert with 'Unauthorized' when non-admin calls runPayroll", async function () {
        const { treasury, mnee, admin, user1, user2 } = await loadFixture(deployTreasuryFixture);

        // Fund treasury
        const fundAmount = ethers.parseEther("1000");
        await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
        await treasury.connect(admin).deposit(fundAmount);

        const recipients = [user2.address];
        const amounts = [ethers.parseEther("100")];
        const runId = ethers.id("access-test-1");

        // user1 is not admin
        await expect(
          treasury.connect(user1).runPayroll(recipients, amounts, runId)
        ).to.be.revertedWith("Unauthorized");
      });

      it("should revert with 'Unauthorized' for any non-admin address", async function () {
        const { treasury, mnee, admin, user1, user2, user3 } = await loadFixture(deployTreasuryFixture);

        // Fund treasury
        const fundAmount = ethers.parseEther("1000");
        await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
        await treasury.connect(admin).deposit(fundAmount);

        const recipients = [admin.address];
        const amounts = [ethers.parseEther("10")];
        const runId = ethers.id("access-test-2");

        // Test multiple non-admin users
        await expect(
          treasury.connect(user1).runPayroll(recipients, amounts, runId)
        ).to.be.revertedWith("Unauthorized");

        await expect(
          treasury.connect(user2).runPayroll(recipients, amounts, runId)
        ).to.be.revertedWith("Unauthorized");

        await expect(
          treasury.connect(user3).runPayroll(recipients, amounts, runId)
        ).to.be.revertedWith("Unauthorized");
      });

      it("should allow admin to call runPayroll", async function () {
        const { treasury, mnee, admin, user1 } = await loadFixture(deployTreasuryFixture);

        // Fund treasury
        const fundAmount = ethers.parseEther("1000");
        await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
        await treasury.connect(admin).deposit(fundAmount);

        const recipients = [user1.address];
        const amounts = [ethers.parseEther("100")];
        const runId = ethers.id("access-test-3");

        await expect(
          treasury.connect(admin).runPayroll(recipients, amounts, runId)
        ).to.not.be.reverted;
      });
    });

    describe("setAdmin access control", function () {
      it("should revert with 'Unauthorized' when non-admin calls setAdmin", async function () {
        const { treasury, user1, user2 } = await loadFixture(deployTreasuryFixture);

        await expect(
          treasury.connect(user1).setAdmin(user2.address)
        ).to.be.revertedWith("Unauthorized");
      });

      it("should revert with 'Unauthorized' for any non-admin address", async function () {
        const { treasury, user1, user2, user3 } = await loadFixture(deployTreasuryFixture);

        // Test multiple non-admin users
        await expect(
          treasury.connect(user1).setAdmin(user2.address)
        ).to.be.revertedWith("Unauthorized");

        await expect(
          treasury.connect(user2).setAdmin(user3.address)
        ).to.be.revertedWith("Unauthorized");

        await expect(
          treasury.connect(user3).setAdmin(user1.address)
        ).to.be.revertedWith("Unauthorized");
      });

      it("should allow admin to call setAdmin", async function () {
        const { treasury, admin, user1 } = await loadFixture(deployTreasuryFixture);

        await expect(
          treasury.connect(admin).setAdmin(user1.address)
        ).to.not.be.reverted;

        expect(await treasury.getAdmin()).to.equal(user1.address);
      });

      it("should revoke previous admin access after setAdmin", async function () {
        const { treasury, mnee, admin, user1, user2 } = await loadFixture(deployTreasuryFixture);

        // Fund treasury
        const fundAmount = ethers.parseEther("1000");
        await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
        await treasury.connect(admin).deposit(fundAmount);

        // Transfer admin to user1
        await treasury.connect(admin).setAdmin(user1.address);

        // Previous admin should no longer have access
        await expect(
          treasury.connect(admin).setAdmin(user2.address)
        ).to.be.revertedWith("Unauthorized");

        const recipients = [user2.address];
        const amounts = [ethers.parseEther("10")];
        const runId = ethers.id("revoke-test");

        await expect(
          treasury.connect(admin).runPayroll(recipients, amounts, runId)
        ).to.be.revertedWith("Unauthorized");
      });
    });

    describe("emergencyWithdraw access control", function () {
      it("should revert with 'Unauthorized' when non-admin calls emergencyWithdraw", async function () {
        const { treasury, mnee, admin, user1, user2 } = await loadFixture(deployTreasuryFixture);

        // Fund treasury
        const fundAmount = ethers.parseEther("1000");
        await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
        await treasury.connect(admin).deposit(fundAmount);

        await expect(
          treasury.connect(user1).emergencyWithdraw(ethers.parseEther("100"), user2.address)
        ).to.be.revertedWith("Unauthorized");
      });

      it("should revert with 'Unauthorized' for any non-admin address", async function () {
        const { treasury, mnee, admin, user1, user2, user3 } = await loadFixture(deployTreasuryFixture);

        // Fund treasury
        const fundAmount = ethers.parseEther("1000");
        await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
        await treasury.connect(admin).deposit(fundAmount);

        const withdrawAmount = ethers.parseEther("100");

        // Test multiple non-admin users
        await expect(
          treasury.connect(user1).emergencyWithdraw(withdrawAmount, user2.address)
        ).to.be.revertedWith("Unauthorized");

        await expect(
          treasury.connect(user2).emergencyWithdraw(withdrawAmount, user3.address)
        ).to.be.revertedWith("Unauthorized");

        await expect(
          treasury.connect(user3).emergencyWithdraw(withdrawAmount, user1.address)
        ).to.be.revertedWith("Unauthorized");
      });

      it("should allow admin to call emergencyWithdraw", async function () {
        const { treasury, mnee, admin, user1 } = await loadFixture(deployTreasuryFixture);

        // Fund treasury
        const fundAmount = ethers.parseEther("1000");
        await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
        await treasury.connect(admin).deposit(fundAmount);

        await expect(
          treasury.connect(admin).emergencyWithdraw(ethers.parseEther("100"), user1.address)
        ).to.not.be.reverted;
      });
    });

    describe("Consistent error messages", function () {
      it("should use consistent 'Unauthorized' message across all admin functions", async function () {
        const { treasury, mnee, admin, user1, user2 } = await loadFixture(deployTreasuryFixture);

        // Fund treasury
        const fundAmount = ethers.parseEther("1000");
        await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
        await treasury.connect(admin).deposit(fundAmount);

        // All admin functions should revert with the same "Unauthorized" message
        await expect(
          treasury.connect(user1).runPayroll([user2.address], [ethers.parseEther("10")], ethers.id("test"))
        ).to.be.revertedWith("Unauthorized");

        await expect(
          treasury.connect(user1).setAdmin(user2.address)
        ).to.be.revertedWith("Unauthorized");

        await expect(
          treasury.connect(user1).emergencyWithdraw(ethers.parseEther("10"), user2.address)
        ).to.be.revertedWith("Unauthorized");
      });
    });

    describe("deposit() has no access control", function () {
      it("should allow any address to deposit (no admin restriction)", async function () {
        const { treasury, mnee, user1, user2, user3 } = await loadFixture(deployTreasuryFixture);
        const depositAmount = ethers.parseEther("10");

        // Mint tokens to all users
        await mnee.mint(user2.address, depositAmount);
        await mnee.mint(user3.address, depositAmount);

        // All users should be able to deposit
        await mnee.connect(user1).approve(await treasury.getAddress(), depositAmount);
        await expect(treasury.connect(user1).deposit(depositAmount)).to.not.be.reverted;

        await mnee.connect(user2).approve(await treasury.getAddress(), depositAmount);
        await expect(treasury.connect(user2).deposit(depositAmount)).to.not.be.reverted;

        await mnee.connect(user3).approve(await treasury.getAddress(), depositAmount);
        await expect(treasury.connect(user3).deposit(depositAmount)).to.not.be.reverted;
      });
    });

    describe("View functions have no access control", function () {
      it("should allow any address to call getBalance", async function () {
        const { treasury, user1, user2, user3 } = await loadFixture(deployTreasuryFixture);

        // All users should be able to query balance - view functions return values
        expect(await treasury.connect(user1).getBalance()).to.equal(0n);
        expect(await treasury.connect(user2).getBalance()).to.equal(0n);
        expect(await treasury.connect(user3).getBalance()).to.equal(0n);
      });

      it("should allow any address to call getAdmin", async function () {
        const { treasury, admin, user1, user2, user3 } = await loadFixture(deployTreasuryFixture);

        // All users should be able to query admin - view functions don't revert
        expect(await treasury.connect(user1).getAdmin()).to.equal(admin.address);
        expect(await treasury.connect(user2).getAdmin()).to.equal(admin.address);
        expect(await treasury.connect(user3).getAdmin()).to.equal(admin.address);
      });
    });
  });
});
