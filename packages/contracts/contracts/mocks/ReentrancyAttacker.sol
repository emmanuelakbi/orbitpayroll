// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IPayrollTreasury {
    function deposit(uint256 amount) external;
    function runPayroll(address[] calldata recipients, uint256[] calldata amounts, bytes32 offchainRunId) external;
    function emergencyWithdraw(uint256 amount, address recipient) external;
    function getBalance() external view returns (uint256);
}

/**
 * @title ReentrancyAttacker
 * @dev Malicious contract that attempts reentrancy attacks on PayrollTreasury
 * @notice This contract is for testing purposes only
 */
contract ReentrancyAttacker {
    IPayrollTreasury public treasury;
    IERC20 public token;
    uint256 public attackCount;
    uint256 public maxAttacks;
    
    enum AttackType { DEPOSIT, PAYROLL, EMERGENCY_WITHDRAW }
    AttackType public currentAttack;
    
    constructor(address _treasury, address _token) {
        treasury = IPayrollTreasury(_treasury);
        token = IERC20(_token);
    }
    
    /**
     * @dev Attempts reentrancy during deposit
     */
    function attackDeposit(uint256 amount) external {
        currentAttack = AttackType.DEPOSIT;
        attackCount = 0;
        maxAttacks = 2;
        
        token.approve(address(treasury), amount * maxAttacks);
        treasury.deposit(amount);
    }
    
    /**
     * @dev Attempts reentrancy during runPayroll (requires this contract to be admin)
     */
    function attackPayroll(address recipient, uint256 amount) external {
        currentAttack = AttackType.PAYROLL;
        attackCount = 0;
        maxAttacks = 2;
        
        address[] memory recipients = new address[](1);
        recipients[0] = recipient;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        
        treasury.runPayroll(recipients, amounts, bytes32(0));
    }
    
    /**
     * @dev Attempts reentrancy during emergencyWithdraw (requires this contract to be admin)
     */
    function attackEmergencyWithdraw(uint256 amount) external {
        currentAttack = AttackType.EMERGENCY_WITHDRAW;
        attackCount = 0;
        maxAttacks = 2;
        
        treasury.emergencyWithdraw(amount, address(this));
    }
    
    /**
     * @dev Fallback function that attempts reentrant calls when receiving tokens
     */
    receive() external payable {
        _attemptReentry();
    }
    
    /**
     * @dev Called when this contract receives ERC20 tokens (via transfer hooks if any)
     */
    function onTokenTransfer(address, uint256, bytes calldata) external returns (bool) {
        _attemptReentry();
        return true;
    }
    
    function _attemptReentry() internal {
        attackCount++;
        if (attackCount < maxAttacks) {
            if (currentAttack == AttackType.DEPOSIT) {
                // Try to reenter deposit
                try treasury.deposit(1) {} catch {}
            } else if (currentAttack == AttackType.PAYROLL) {
                // Try to reenter runPayroll
                address[] memory recipients = new address[](1);
                recipients[0] = address(this);
                uint256[] memory amounts = new uint256[](1);
                amounts[0] = 1;
                try treasury.runPayroll(recipients, amounts, bytes32(uint256(attackCount))) {} catch {}
            } else if (currentAttack == AttackType.EMERGENCY_WITHDRAW) {
                // Try to reenter emergencyWithdraw
                try treasury.emergencyWithdraw(1, address(this)) {} catch {}
            }
        }
    }
}

/**
 * @title MaliciousToken
 * @dev ERC20 token with hooks that attempt reentrancy during transfers
 * @notice This contract is for testing purposes only
 */
contract MaliciousToken is ERC20 {
    address public attacker;
    IPayrollTreasury public treasury;
    bool public attackEnabled;
    uint256 public attackCount;
    
    constructor() ERC20("Malicious Token", "MAL") {}
    
    function setAttacker(address _attacker, address _treasury) external {
        attacker = _attacker;
        treasury = IPayrollTreasury(_treasury);
    }
    
    function enableAttack(bool _enabled) external {
        attackEnabled = _enabled;
        attackCount = 0;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function _update(address from, address to, uint256 value) internal virtual override {
        super._update(from, to, value);
        
        // Attempt reentrancy when tokens are transferred FROM the treasury
        if (attackEnabled && from == address(treasury) && attackCount < 1) {
            attackCount++;
            // Try to reenter emergencyWithdraw
            try treasury.emergencyWithdraw(1, attacker) {} catch {}
        }
    }
}
