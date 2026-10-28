// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {OrielStaking} from "../src/OrielStaking.sol";
import {RevenueDistributor} from "../src/RevenueDistributor.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock", "MCK") {}
    function mint(address to, uint256 a) external { _mint(to, a); }
}

contract OrielTest is Test {
    MockToken oriel; MockToken usdg; OrielStaking staking; RevenueDistributor dist;
    address alice = address(0xA11CE); address bob = address(0xB0B); address owner = address(0x0123);

    function setUp() public {
        oriel = new MockToken(); usdg = new MockToken();
        staking = new OrielStaking(oriel);
        dist = new RevenueDistributor(usdg, owner);
        oriel.mint(alice, 1_000e18);
    }

    function test_stake_unstake() public {
        vm.startPrank(alice);
        oriel.approve(address(staking), 600e18);
        staking.stake(600e18);
        assertEq(staking.stakedOf(alice), 600e18);
        assertEq(staking.totalStaked(), 600e18);
        staking.unstake(250e18);
        assertEq(staking.stakedOf(alice), 350e18);
        assertEq(oriel.balanceOf(alice), 650e18);
        vm.expectRevert(abi.encodeWithSelector(OrielStaking.InsufficientStake.selector, 351e18, 350e18));
        staking.unstake(351e18);
        vm.stopPrank();
    }

    function test_cannot_unstake_others() public {
        vm.startPrank(alice); oriel.approve(address(staking), 1e18); staking.stake(1e18); vm.stopPrank();
        vm.prank(bob);
        vm.expectRevert();
        staking.unstake(1e18);
    }

    function test_distributor_two_leaves() public {
        bytes32 la = keccak256(bytes.concat(keccak256(abi.encode(alice, uint256(30e6)))));
        bytes32 lb = keccak256(bytes.concat(keccak256(abi.encode(bob, uint256(70e6)))));
        bytes32 root = la < lb ? keccak256(abi.encodePacked(la, lb)) : keccak256(abi.encodePacked(lb, la));
        usdg.mint(owner, 100e6);
        vm.startPrank(owner); usdg.approve(address(dist), 100e6); dist.createEpoch(202610, root, 100e6); vm.stopPrank();

        bytes32[] memory pa = new bytes32[](1); pa[0] = lb;
        dist.claim(202610, alice, 30e6, pa);
        assertEq(usdg.balanceOf(alice), 30e6);
        vm.expectRevert(RevenueDistributor.AlreadyClaimed.selector);
        dist.claim(202610, alice, 30e6, pa);

        bytes32[] memory pb = new bytes32[](1); pb[0] = la;
        vm.expectRevert(RevenueDistributor.InvalidProof.selector);
        dist.claim(202610, bob, 71e6, pb);
        dist.claim(202610, bob, 70e6, pb);
        assertEq(usdg.balanceOf(bob), 70e6);

        vm.prank(owner); vm.expectRevert(RevenueDistributor.WindowOpen.selector); dist.sweep(202610);
        vm.warp(block.timestamp + 366 days);
        vm.prank(owner); dist.sweep(202610);
    }

    function testFuzz_stake(uint96 a) public {
        vm.assume(a > 0 && a <= 1_000e18);
        vm.startPrank(alice); oriel.approve(address(staking), a); staking.stake(a); staking.unstake(a); vm.stopPrank();
        assertEq(oriel.balanceOf(alice), 1_000e18);
        assertEq(staking.totalStaked(), 0);
    }
}
