import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { PayrollTreasury, MockMNEE } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PayrollTreasury", function () {
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

    // Mint tokens to users for testing
    const mintAmount = ethers.parseEther("10000");
    await mnee.mint(admin.address, mintAmount);
    await mnee.mint(user1.address, mintAmount);

    return { treasury, mnee, admin, user1, user2, user3 };
  }

  // ============ Deployment Tests (Task 4.1) ============
  describe("Deployment", function () {
    it("should set admin correctly", async function () {
      const { treasury, admin } = await loadFixture(deployTreasuryFixture);
      expect(await treasury.getAdmin()).to.equal(admin.address);
    });

    it("should store MNEE token address", async function () {
      const { treasury, mnee } = await loadFixture(deployTreasuryFixture);
      expect(await treasury.mneeToken()).to.equal(await mnee.getAddress());
    });

    it("should emit TreasuryCreated event", async function () {
      const [admin] = await ethers.getSigners();
      const MockMNEE = await ethers.getContractFactory("MockMNEE");
      const mnee = await MockMNEE.deploy("Mock MNEE", "MNEE", 18);
      await mnee.waitForDeployment();
      const mneeAddress = await mnee.getAddress();

      const PayrollTreasury = await ethers.getContractFactory("PayrollTreasury");
      const treasury = await PayrollTreasury.deploy(admin.address, mneeAddress);
      await treasury.waitForDeployment();

      // Check the deployment transaction for the event
      const deployTx = treasury.deploymentTransaction();
      await expect(deployTx)
        .to.emit(treasury, "TreasuryCreated")
        .withArgs(admin.address, mneeAddress);
    });

    it("should revert with zero admin address", async function () {
      const MockMNEE = await ethers.getContractFactory("MockMNEE");
      const mnee = await MockMNEE.deploy("Mock MNEE", "MNEE", 18);
      await mnee.waitForDeployment();

      const PayrollTreasury = await ethers.getContractFactory("PayrollTreasury");
      await expect(
        PayrollTreasury.deploy(ethers.ZeroAddress, await mnee.getAddress())
      ).to.be.revertedWith("Invalid admin address");
    });

    it("should revert with zero token address", async function () {
      const [admin] = await ethers.getSigners();
      const PayrollTreasury = await ethers.getContractFactory("PayrollTreasury");
      await expect(
        PayrollTreasury.deploy(admin.address, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid token address");
    });
  });


  // ============ Deposit Tests (Task 4.2) ============
  describe("Deposit", function () {
    it("should transfer MNEE to treasury on successful deposit", async function () {
      const { treasury, mnee, user1 } = await loadFixture(deployTreasuryFixture);
      const depositAmount = ethers.parseEther("100");

      // Approve treasury to spend tokens
      await mnee.connect(user1).approve(await treasury.getAddress(), depositAmount);

      const balanceBefore = await mnee.balanceOf(await treasury.getAddress());
      await treasury.connect(user1).deposit(depositAmount);
      const balanceAfter = await mnee.balanceOf(await treasury.getAddress());

      expect(balanceAfter - balanceBefore).to.equal(depositAmount);
    });

    it("should emit Deposited event", async function () {
      const { treasury, mnee, user1 } = await loadFixture(deployTreasuryFixture);
      const depositAmount = ethers.parseEther("100");

      await mnee.connect(user1).approve(await treasury.getAddress(), depositAmount);

      await expect(treasury.connect(user1).deposit(depositAmount))
        .to.emit(treasury, "Deposited")
        .withArgs(user1.address, depositAmount);
    });

    it("should allow any address to deposit (not restricted to admin)", async function () {
      const { treasury, mnee, user1 } = await loadFixture(deployTreasuryFixture);
      const depositAmount = ethers.parseEther("50");

      await mnee.connect(user1).approve(await treasury.getAddress(), depositAmount);
      
      // user1 is not admin, but should be able to deposit
      await expect(treasury.connect(user1).deposit(depositAmount)).to.not.be.reverted;
    });

    it("should revert with zero amount", async function () {
      const { treasury, user1 } = await loadFixture(deployTreasuryFixture);

      await expect(treasury.connect(user1).deposit(0)).to.be.revertedWith(
        "Amount must be greater than zero"
      );
    });

    it("should revert with insufficient allowance", async function () {
      const { treasury, mnee, user1 } = await loadFixture(deployTreasuryFixture);
      const depositAmount = ethers.parseEther("100");

      // No approval given
      await expect(treasury.connect(user1).deposit(depositAmount)).to.be.reverted;
    });

    it("should revert when user has insufficient balance", async function () {
      const { treasury, mnee, user2 } = await loadFixture(deployTreasuryFixture);
      const depositAmount = ethers.parseEther("100");

      // user2 has no tokens but approves
      await mnee.connect(user2).approve(await treasury.getAddress(), depositAmount);

      await expect(treasury.connect(user2).deposit(depositAmount)).to.be.reverted;
    });
  });


  // ============ RunPayroll Tests (Task 4.3) ============
  describe("RunPayroll", function () {
    async function deployAndFundTreasuryFixture() {
      const fixture = await deployTreasuryFixture();
      const { treasury, mnee, admin } = fixture;

      // Fund treasury with tokens
      const fundAmount = ethers.parseEther("1000");
      await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
      await treasury.connect(admin).deposit(fundAmount);

      return fixture;
    }

    it("should distribute MNEE to all recipients", async function () {
      const { treasury, mnee, admin, user1, user2 } = await loadFixture(deployAndFundTreasuryFixture);

      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];
      const runId = ethers.id("test-run-1");

      const user1BalanceBefore = await mnee.balanceOf(user1.address);
      const user2BalanceBefore = await mnee.balanceOf(user2.address);

      await treasury.connect(admin).runPayroll(recipients, amounts, runId);

      expect(await mnee.balanceOf(user1.address)).to.equal(user1BalanceBefore + amounts[0]);
      expect(await mnee.balanceOf(user2.address)).to.equal(user2BalanceBefore + amounts[1]);
    });

    it("should emit PayrollExecuted event", async function () {
      const { treasury, admin, user1, user2 } = await loadFixture(deployAndFundTreasuryFixture);

      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];
      const totalAmount = amounts[0] + amounts[1];
      const runId = ethers.id("test-run-2");

      const tx = await treasury.connect(admin).runPayroll(recipients, amounts, runId);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(treasury, "PayrollExecuted")
        .withArgs(runId, totalAmount, recipients.length, block!.timestamp);
    });

    it("should revert for non-admin caller", async function () {
      const { treasury, user1, user2 } = await loadFixture(deployAndFundTreasuryFixture);

      const recipients = [user2.address];
      const amounts = [ethers.parseEther("100")];
      const runId = ethers.id("test-run-3");

      await expect(
        treasury.connect(user1).runPayroll(recipients, amounts, runId)
      ).to.be.revertedWith("Unauthorized");
    });

    it("should revert with mismatched array lengths", async function () {
      const { treasury, admin, user1, user2 } = await loadFixture(deployAndFundTreasuryFixture);

      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("100")]; // Only one amount
      const runId = ethers.id("test-run-4");

      await expect(
        treasury.connect(admin).runPayroll(recipients, amounts, runId)
      ).to.be.revertedWith("Array length mismatch");
    });

    it("should revert with empty recipients array", async function () {
      const { treasury, admin } = await loadFixture(deployAndFundTreasuryFixture);

      const recipients: string[] = [];
      const amounts: bigint[] = [];
      const runId = ethers.id("test-run-5");

      await expect(
        treasury.connect(admin).runPayroll(recipients, amounts, runId)
      ).to.be.revertedWith("No recipients");
    });

    it("should revert with zero amount", async function () {
      const { treasury, admin, user1 } = await loadFixture(deployAndFundTreasuryFixture);

      const recipients = [user1.address];
      const amounts = [BigInt(0)];
      const runId = ethers.id("test-run-6");

      await expect(
        treasury.connect(admin).runPayroll(recipients, amounts, runId)
      ).to.be.revertedWith("Invalid amount");
    });

    it("should revert with zero address recipient", async function () {
      const { treasury, admin } = await loadFixture(deployAndFundTreasuryFixture);

      const recipients = [ethers.ZeroAddress];
      const amounts = [ethers.parseEther("100")];
      const runId = ethers.id("test-run-7");

      await expect(
        treasury.connect(admin).runPayroll(recipients, amounts, runId)
      ).to.be.revertedWith("Invalid recipient");
    });

    it("should revert with insufficient treasury balance", async function () {
      const { treasury, admin, user1 } = await loadFixture(deployAndFundTreasuryFixture);

      const recipients = [user1.address];
      const amounts = [ethers.parseEther("10000")]; // More than treasury balance
      const runId = ethers.id("test-run-8");

      await expect(
        treasury.connect(admin).runPayroll(recipients, amounts, runId)
      ).to.be.revertedWith("Insufficient treasury balance");
    });

    it("should revert with too many recipients", async function () {
      const { treasury, admin } = await loadFixture(deployAndFundTreasuryFixture);

      // Create 101 recipients (exceeds MAX_RECIPIENTS of 100)
      const recipients = Array(101).fill(null).map(() => ethers.Wallet.createRandom().address);
      const amounts = Array(101).fill(ethers.parseEther("1"));
      const runId = ethers.id("test-run-9");

      await expect(
        treasury.connect(admin).runPayroll(recipients, amounts, runId)
      ).to.be.revertedWith("Too many recipients");
    });
  });


  // ============ Admin Management Tests (Task 4.4) ============
  describe("Admin Management", function () {
    it("should allow admin to change admin", async function () {
      const { treasury, admin, user1 } = await loadFixture(deployTreasuryFixture);

      await treasury.connect(admin).setAdmin(user1.address);

      expect(await treasury.getAdmin()).to.equal(user1.address);
    });

    it("should emit AdminChanged event", async function () {
      const { treasury, admin, user1 } = await loadFixture(deployTreasuryFixture);

      await expect(treasury.connect(admin).setAdmin(user1.address))
        .to.emit(treasury, "AdminChanged")
        .withArgs(admin.address, user1.address);
    });

    it("should revert setAdmin for non-admin caller", async function () {
      const { treasury, user1, user2 } = await loadFixture(deployTreasuryFixture);

      await expect(
        treasury.connect(user1).setAdmin(user2.address)
      ).to.be.revertedWith("Unauthorized");
    });

    it("should revert setAdmin to zero address", async function () {
      const { treasury, admin } = await loadFixture(deployTreasuryFixture);

      await expect(
        treasury.connect(admin).setAdmin(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid admin address");
    });

    it("should return correct admin via getAdmin", async function () {
      const { treasury, admin } = await loadFixture(deployTreasuryFixture);

      expect(await treasury.getAdmin()).to.equal(admin.address);
    });

    it("should allow new admin to perform admin actions after transfer", async function () {
      const { treasury, mnee, admin, user1, user2 } = await loadFixture(deployTreasuryFixture);

      // Transfer admin to user1
      await treasury.connect(admin).setAdmin(user1.address);

      // Fund treasury
      const fundAmount = ethers.parseEther("100");
      await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
      await treasury.connect(admin).deposit(fundAmount);

      // New admin (user1) should be able to run payroll
      const recipients = [user2.address];
      const amounts = [ethers.parseEther("50")];
      const runId = ethers.id("admin-transfer-test");

      await expect(
        treasury.connect(user1).runPayroll(recipients, amounts, runId)
      ).to.not.be.reverted;
    });
  });


  // ============ Emergency Withdrawal Tests (Task 4.5) ============
  describe("Emergency Withdrawal", function () {
    async function deployAndFundTreasuryFixture() {
      const fixture = await deployTreasuryFixture();
      const { treasury, mnee, admin } = fixture;

      // Fund treasury with tokens
      const fundAmount = ethers.parseEther("1000");
      await mnee.connect(admin).approve(await treasury.getAddress(), fundAmount);
      await treasury.connect(admin).deposit(fundAmount);

      return fixture;
    }

    it("should transfer MNEE to recipient on successful withdrawal", async function () {
      const { treasury, mnee, admin, user1 } = await loadFixture(deployAndFundTreasuryFixture);
      const withdrawAmount = ethers.parseEther("500");

      const recipientBalanceBefore = await mnee.balanceOf(user1.address);
      const treasuryBalanceBefore = await treasury.getBalance();

      await treasury.connect(admin).emergencyWithdraw(withdrawAmount, user1.address);

      expect(await mnee.balanceOf(user1.address)).to.equal(recipientBalanceBefore + withdrawAmount);
      expect(await treasury.getBalance()).to.equal(treasuryBalanceBefore - withdrawAmount);
    });

    it("should emit EmergencyWithdrawal event", async function () {
      const { treasury, admin, user1 } = await loadFixture(deployAndFundTreasuryFixture);
      const withdrawAmount = ethers.parseEther("500");

      await expect(treasury.connect(admin).emergencyWithdraw(withdrawAmount, user1.address))
        .to.emit(treasury, "EmergencyWithdrawal")
        .withArgs(admin.address, user1.address, withdrawAmount);
    });

    it("should revert for non-admin caller", async function () {
      const { treasury, user1, user2 } = await loadFixture(deployAndFundTreasuryFixture);
      const withdrawAmount = ethers.parseEther("100");

      await expect(
        treasury.connect(user1).emergencyWithdraw(withdrawAmount, user2.address)
      ).to.be.revertedWith("Unauthorized");
    });

    it("should revert with insufficient balance", async function () {
      const { treasury, admin, user1 } = await loadFixture(deployAndFundTreasuryFixture);
      const withdrawAmount = ethers.parseEther("10000"); // More than treasury balance

      await expect(
        treasury.connect(admin).emergencyWithdraw(withdrawAmount, user1.address)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("should revert with zero recipient address", async function () {
      const { treasury, admin } = await loadFixture(deployAndFundTreasuryFixture);
      const withdrawAmount = ethers.parseEther("100");

      await expect(
        treasury.connect(admin).emergencyWithdraw(withdrawAmount, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid recipient");
    });

    it("should revert with zero amount", async function () {
      const { treasury, admin, user1 } = await loadFixture(deployAndFundTreasuryFixture);

      await expect(
        treasury.connect(admin).emergencyWithdraw(0, user1.address)
      ).to.be.revertedWith("Amount must be greater than zero");
    });

    it("should allow full balance withdrawal", async function () {
      const { treasury, mnee, admin, user1 } = await loadFixture(deployAndFundTreasuryFixture);
      const fullBalance = await treasury.getBalance();

      await treasury.connect(admin).emergencyWithdraw(fullBalance, user1.address);

      expect(await treasury.getBalance()).to.equal(0);
    });
  });

  // ============ Balance Query Tests ============
  describe("Balance Query", function () {
    it("should return zero for empty treasury", async function () {
      const { treasury } = await loadFixture(deployTreasuryFixture);
      expect(await treasury.getBalance()).to.equal(0);
    });

    it("should return correct balance after deposit", async function () {
      const { treasury, mnee, admin } = await loadFixture(deployTreasuryFixture);
      const depositAmount = ethers.parseEther("500");

      await mnee.connect(admin).approve(await treasury.getAddress(), depositAmount);
      await treasury.connect(admin).deposit(depositAmount);

      expect(await treasury.getBalance()).to.equal(depositAmount);
    });

    it("should return correct balance after multiple deposits", async function () {
      const { treasury, mnee, admin, user1 } = await loadFixture(deployTreasuryFixture);
      const deposit1 = ethers.parseEther("100");
      const deposit2 = ethers.parseEther("200");

      await mnee.connect(admin).approve(await treasury.getAddress(), deposit1);
      await treasury.connect(admin).deposit(deposit1);

      await mnee.connect(user1).approve(await treasury.getAddress(), deposit2);
      await treasury.connect(user1).deposit(deposit2);

      expect(await treasury.getBalance()).to.equal(deposit1 + deposit2);
    });
  });
});
