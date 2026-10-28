// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {OrielStaking} from "../src/OrielStaking.sol";
import {RevenueDistributor} from "../src/RevenueDistributor.sol";

/// forge script script/Deploy.s.sol --rpc-url robinhood --broadcast
/// Env: ORIEL_TOKEN_ADDRESS, USDG_TOKEN_ADDRESS, DISTRIBUTOR_OWNER (multisig address), PRIVATE_KEY deployer
contract Deploy is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        OrielStaking s = new OrielStaking(IERC20(vm.envAddress("ORIEL_TOKEN_ADDRESS")));
        RevenueDistributor d = new RevenueDistributor(IERC20(vm.envAddress("USDG_TOKEN_ADDRESS")), vm.envAddress("DISTRIBUTOR_OWNER"));
        vm.stopBroadcast();
        console.log("STAKING_CONTRACT_ADDRESS", address(s));
        console.log("REVSHARE_DISTRIBUTOR_ADDRESS", address(d));
    }
}
