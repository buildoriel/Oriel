// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title RevenueDistributor
/// @notice Bagi hasil bulanan ke staker dalam USDG. Backend membuat Merkle tree (format OpenZeppelin
///         StandardMerkleTree, leaf = [address, uint256]); owner (multisig) mengunggah root per epoch
///         sekaligus menyetor USDG. Staker klaim sendiri.
contract RevenueDistributor is Ownable2Step {
    using SafeERC20 for IERC20;

    struct Epoch { bytes32 root; uint128 total; uint128 claimed; uint64 createdAt; }

    IERC20 public immutable usdg;
    uint256 public constant CLAIM_WINDOW = 365 days;
    mapping(uint256 => Epoch) public epochs;                 // epoch = yyyymm, mis. 202610
    mapping(uint256 => mapping(address => bool)) public claimed;

    event EpochCreated(uint256 indexed epoch, bytes32 root, uint256 total);
    event Claimed(uint256 indexed epoch, address indexed account, uint256 amount);
    event Swept(uint256 indexed epoch, uint256 amount);

    error EpochExists();
    error UnknownEpoch();
    error AlreadyClaimed();
    error InvalidProof();
    error WindowOpen();

    constructor(IERC20 _usdg, address _owner) Ownable(_owner) {
        usdg = _usdg;
    }

    function createEpoch(uint256 epoch, bytes32 root, uint128 total) external onlyOwner {
        if (epochs[epoch].root != bytes32(0)) revert EpochExists();
        epochs[epoch] = Epoch(root, total, 0, uint64(block.timestamp));
        usdg.safeTransferFrom(msg.sender, address(this), total);
        emit EpochCreated(epoch, root, total);
    }

    function claim(uint256 epoch, address account, uint256 amount, bytes32[] calldata proof) external {
        Epoch storage e = epochs[epoch];
        if (e.root == bytes32(0)) revert UnknownEpoch();
        if (claimed[epoch][account]) revert AlreadyClaimed();
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
        if (!MerkleProof.verifyCalldata(proof, e.root, leaf)) revert InvalidProof();
        claimed[epoch][account] = true;
        e.claimed += uint128(amount);
        usdg.safeTransfer(account, amount);
        emit Claimed(epoch, account, amount);
    }

    /// @notice USDG yang tidak diklaim setelah 1 tahun dikembalikan ke owner (treasury).
    function sweep(uint256 epoch) external onlyOwner {
        Epoch storage e = epochs[epoch];
        if (e.root == bytes32(0)) revert UnknownEpoch();
        if (block.timestamp < e.createdAt + CLAIM_WINDOW) revert WindowOpen();
        uint256 left = e.total - e.claimed;
        e.claimed = e.total;
        usdg.safeTransfer(owner(), left);
        emit Swept(epoch, left);
    }
}
