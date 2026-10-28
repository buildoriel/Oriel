// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title OrielStaking
/// @notice Menyimpan jumlah $ORIEL yang di-stake per wallet. Tidak ada reward, harga, atau tier on-chain:
///         backend Oriel membaca `stakedOf`, menghitung nilai dengan TWAP 7 hari, lalu menentukan tier.
/// @dev Tanpa owner, tanpa pause, tanpa upgrade. Unstake selalu bisa dilakukan kapan saja.
contract OrielStaking is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    mapping(address => uint256) public stakedOf;
    uint256 public totalStaked;

    event Staked(address indexed user, uint256 amount, uint256 newBalance);
    event Unstaked(address indexed user, uint256 amount, uint256 newBalance);

    error ZeroAmount();
    error InsufficientStake(uint256 requested, uint256 available);

    constructor(IERC20 _token) {
        token = _token;
    }

    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        // hitung yang benar-benar diterima (aman untuk token dengan biaya transfer)
        uint256 before = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = token.balanceOf(address(this)) - before;
        if (received == 0) revert ZeroAmount();
        uint256 nb = stakedOf[msg.sender] + received;
        stakedOf[msg.sender] = nb;
        totalStaked += received;
        emit Staked(msg.sender, received, nb);
    }

    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 bal = stakedOf[msg.sender];
        if (amount > bal) revert InsufficientStake(amount, bal);
        uint256 nb = bal - amount;
        stakedOf[msg.sender] = nb;
        totalStaked -= amount;
        token.safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount, nb);
    }
}
