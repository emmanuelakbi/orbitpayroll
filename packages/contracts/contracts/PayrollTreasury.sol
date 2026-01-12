// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PayrollTreasury
 * @dev Holds MNEE tokens for an organization and manages payroll execution
 * @notice This contract enables batch payroll payments to contractors
 */
contract PayrollTreasury is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Events ============

    event TreasuryCreated(address indexed admin, address indexed mneeToken);
    event Deposited(address indexed depositor, uint256 amount);
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
    event EmergencyWithdrawal(address indexed admin, address indexed recipient, uint256 amount);
    event PayrollExecuted(
        bytes32 indexed offchainRunId,
        uint256 totalAmount,
        uint256 recipientCount,
        uint256 timestamp
    );

    // ============ State Variables ============

    /// @notice The MNEE token contract (immutable)
    IERC20 public immutable mneeToken;

    /// @notice Current admin address
    address public admin;

    /// @notice Maximum recipients per payroll run (gas limit safety)
    uint256 public constant MAX_RECIPIENTS = 100;

    // ============ Constructor ============

    /**
     * @dev Initializes the treasury with admin and MNEE token addresses
     * @param _admin The initial admin address
     * @param _mneeToken The MNEE token contract address
     */
    constructor(address _admin, address _mneeToken) {
        require(_admin != address(0), "Invalid admin address");
        require(_mneeToken != address(0), "Invalid token address");

        admin = _admin;
        mneeToken = IERC20(_mneeToken);

        emit TreasuryCreated(_admin, _mneeToken);
    }

    // ============ Deposit Function ============

    /**
     * @dev Deposits MNEE tokens into the treasury
     * @param amount The amount of MNEE to deposit
     * @notice Caller must have approved this contract to spend their MNEE
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than zero");

        // SafeERC20 handles allowance check and reverts on failure
        mneeToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(msg.sender, amount);
    }

    // ============ Balance Query ============

    /**
     * @dev Returns the current MNEE balance of the treasury
     * @return The MNEE token balance held by this contract
     */
    function getBalance() external view returns (uint256) {
        return mneeToken.balanceOf(address(this));
    }

    // ============ Payroll Execution ============

    /**
     * @dev Executes batch payroll to multiple recipients
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to send to each recipient
     * @param offchainRunId Identifier linking to off-chain payroll run record
     * @notice Only callable by admin
     */
    function runPayroll(
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32 offchainRunId
    ) external nonReentrant {
        // Access control
        require(msg.sender == admin, "Unauthorized");

        // Input validation
        require(recipients.length == amounts.length, "Array length mismatch");
        require(recipients.length > 0, "No recipients");
        require(recipients.length <= MAX_RECIPIENTS, "Too many recipients");

        // Calculate total and validate amounts
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; ) {
            require(amounts[i] > 0, "Invalid amount");
            require(recipients[i] != address(0), "Invalid recipient");
            totalAmount += amounts[i];
            unchecked {
                ++i;
            }
        }

        // Check balance
        require(
            mneeToken.balanceOf(address(this)) >= totalAmount,
            "Insufficient treasury balance"
        );

        // Execute transfers
        for (uint256 i = 0; i < recipients.length; ) {
            mneeToken.safeTransfer(recipients[i], amounts[i]);
            unchecked {
                ++i;
            }
        }

        emit PayrollExecuted(offchainRunId, totalAmount, recipients.length, block.timestamp);
    }

    // ============ Admin Management ============

    /**
     * @dev Returns the current admin address
     * @return The admin address
     */
    function getAdmin() external view returns (address) {
        return admin;
    }

    /**
     * @dev Changes the admin address
     * @param newAdmin The new admin address
     * @notice Only callable by current admin
     */
    function setAdmin(address newAdmin) external {
        require(msg.sender == admin, "Unauthorized");
        require(newAdmin != address(0), "Invalid admin address");

        address previousAdmin = admin;
        admin = newAdmin;

        emit AdminChanged(previousAdmin, newAdmin);
    }

    // ============ Emergency Withdrawal ============

    /**
     * @dev Withdraws MNEE tokens in case of emergency
     * @param amount The amount to withdraw
     * @param recipient The address to receive the tokens
     * @notice Only callable by admin
     */
    function emergencyWithdraw(uint256 amount, address recipient) external nonReentrant {
        require(msg.sender == admin, "Unauthorized");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than zero");
        require(mneeToken.balanceOf(address(this)) >= amount, "Insufficient balance");

        mneeToken.safeTransfer(recipient, amount);

        emit EmergencyWithdrawal(msg.sender, recipient, amount);
    }
}
