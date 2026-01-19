# TIWI Protocol Staking Contract Deployment Guide

## Overview

The TIWI Protocol staking functionality uses a Solidity smart contract (`TiwiStakingPool`) that implements the TIWI Protocol staking reward equations:

- **Reward Rate** = Pool Reward / (Total Staked Tokens × Time)
- **User Reward** = User Staked Amount × Reward Rate × Staking Time

## Contract Location

- **Solidity Contract**: `contracts/TiwiStakingPool.sol`
- **ABI & Types**: `lib/contracts/types.ts`
- **React Hook**: `hooks/useStaking.ts`

## Deployment Steps

### 1. Deploy the Contract

Deploy `TiwiStakingPool.sol` using your preferred deployment tool (Hardhat, Foundry, Remix, etc.):

```solidity
// Constructor parameters:
// - _stakingToken: Address of the ERC20 token users will stake
// - _rewardToken: Address of the ERC20 token used for rewards (can be same as staking token)
// - _owner: Admin address that can configure rewards

constructor(
    address _stakingToken,
    address _rewardToken,
    address _owner
)
```

### 2. Configure the Pool (Admin Only)

After deployment, the admin must configure the pool using `setRewardConfig()`:

```solidity
function setRewardConfig(
    uint256 _poolReward,          // Total reward tokens allocated
    uint256 _rewardDurationSeconds, // Duration in seconds
    uint256 _maxTvl                // Maximum TVL or Total Staked Tokens
)
```

### 3. Fund the Pool (Admin Only)

After configuration, fund the pool with reward tokens using `fundRewards()`:

```solidity
function fundRewards()
```

**Note**: This transfers `poolReward` tokens from the admin's wallet to the contract.

### 4. Add Contract Address to Admin Panel

1. Go to `/admin/staking-pools/[pool-id]`
2. Edit the pool
3. Add the deployed contract address in the `contractAddress` field
4. Save the changes

### 5. Verify Configuration

The contract address will now be included when users view staking pools on `/earn`, enabling real contract interactions.

## Frontend Integration

### User Flow

1. **User visits `/earn`** → Sees available staking pools
2. **Clicks on a pool** → Views pool details
3. **Clicks "Stake Now"** → If contract address is configured:
   - Checks token allowance
   - Approves token if needed
   - Deposits tokens to contract
4. **Rewards accrue** → Calculated per second based on TIWI Protocol formula
5. **User can claim** → Click "Claim Rewards" button
6. **User can unstake** → Click "Unstake" tab and withdraw tokens

### Key Components

- **`hooks/useStaking.ts`**: React hook for contract interactions
- **`components/earn/staking-detail-view.tsx`**: UI component that uses the hook
- **`lib/contracts/types.ts`**: TypeScript types and ABI

## Database Migrations

Run these migrations to add the necessary database columns:

1. **Reward Configuration**: `supabase-schema-staking-pools-reward-config-migration.sql`
   - Adds `max_tvl`, `pool_reward`, `reward_duration_seconds`, `reward_per_second`

2. **Contract Address**: `supabase-schema-staking-pools-contract-address-migration.sql`
   - Adds `contract_address` column

## Testing Checklist

- [ ] Deploy contract to testnet
- [ ] Configure pool with admin settings
- [ ] Fund pool with reward tokens
- [ ] Add contract address in admin panel
- [ ] Test staking from `/earn` page
- [ ] Test approval flow (if needed)
- [ ] Verify rewards accrue correctly
- [ ] Test claim rewards
- [ ] Test unstaking
- [ ] Verify transaction receipts appear correctly

## Admin Configuration

When creating a staking pool in the admin panel, set:

1. **Maximum TVL / Total Staked Tokens**: Maximum tokens that can be staked
2. **Pool Reward**: Total reward tokens to distribute
3. **Reward Duration (Days)**: How long rewards will be distributed

After deployment, add the **Contract Address** to link the database pool to the deployed contract.

## Security Notes

- The contract owner can configure rewards and fund the pool
- Users must approve token spending before staking
- Max TVL prevents exceeding the configured limit
- Rewards are distributed based on user's share of total staked tokens
- Rewards accrue per second according to TIWI Protocol formula

## Support

For issues or questions, refer to:
- Contract code: `contracts/TiwiStakingPool.sol`
- Frontend integration: `hooks/useStaking.ts` and `components/earn/staking-detail-view.tsx`
- API routes: `app/api/v1/staking-pools/route.ts`
