/**
 * Script to update a pool's reward duration (extends expiry date)
 *
 * Usage: npx tsx scripts/update-pool-duration.ts <poolId> <newDurationDays>
 * Example: npx tsx scripts/update-pool-duration.ts 0 90
 */

import { createWalletClient, http, parseUnits } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { TIWI_STAKING_POOL_FACTORY_ABI_ARRAY } from '../lib/contracts/types';

const FACTORY_ADDRESS_BSC = '0x9178044f7cC0DD0dB121E7fCD4b068a0d1B76b07' as `0x${string}`;

async function updatePoolDuration() {
  // Get arguments
  const poolId = process.argv[2];
  const newDurationDays = process.argv[3];

  if (!poolId || !newDurationDays) {
    console.error('Usage: npx tsx scripts/update-pool-duration.ts <poolId> <newDurationDays>');
    console.error('Example: npx tsx scripts/update-pool-duration.ts 0 90');
    process.exit(1);
  }

  // Get private key from environment
  const privateKey = process.env.ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ ADMIN_PRIVATE_KEY not found in environment variables');
    console.error('   Add it to your .env.local file');
    process.exit(1);
  }

  // Create wallet client
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const client = createWalletClient({
    account,
    chain: bsc,
    transport: http(),
  });

  console.log('\n📋 Pool Update Configuration:');
  console.log('==============================');
  console.log(`Pool ID: ${poolId}`);
  console.log(`New Duration: ${newDurationDays} days (${Number(newDurationDays) * 24 * 60 * 60} seconds)`);
  console.log(`Admin Wallet: ${account.address}`);
  console.log(`Factory Contract: ${FACTORY_ADDRESS_BSC}`);
  console.log(`Chain: BSC (${bsc.name})`);
  console.log('');

  try {
    // You need to provide the current pool configuration
    // These values should match your pool's current settings
    const poolReward = process.env.POOL_REWARD || '1000000'; // 1M tokens default
    const maxTvl = process.env.MAX_TVL || '10000000'; // 10M tokens default

    console.log('⚠️  IMPORTANT: Make sure these values match your pool:');
    console.log(`   Pool Reward: ${poolReward} tokens`);
    console.log(`   Max TVL: ${maxTvl} tokens`);
    console.log('');
    console.log('If these are incorrect, set POOL_REWARD and MAX_TVL in .env.local');
    console.log('');

    const poolRewardWei = parseUnits(poolReward, 18);
    const maxTvlWei = parseUnits(maxTvl, 18);
    const rewardDurationSeconds = BigInt(Number(newDurationDays) * 24 * 60 * 60);

    console.log('📤 Sending transaction to update pool...');

    const hash = await client.writeContract({
      address: FACTORY_ADDRESS_BSC,
      abi: TIWI_STAKING_POOL_FACTORY_ABI_ARRAY,
      functionName: 'updatePoolConfig',
      args: [BigInt(poolId), poolRewardWei, rewardDurationSeconds, maxTvlWei],
    });

    console.log(`✅ Transaction sent: ${hash}`);
    console.log(`🔍 View on BSCScan: https://bscscan.com/tx/${hash}`);
    console.log('');
    console.log('⏳ Waiting for confirmation (this may take a minute)...');

    // Wait for transaction
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('');
    console.log('✅ Pool duration updated successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update the database with the new reward_duration_seconds');
    console.log('2. Try staking again - it should work now!');

  } catch (error: any) {
    console.error('❌ Error updating pool:', error.message);

    if (error.message?.includes('NOT_POOL_OWNER')) {
      console.error('');
      console.error('You are not the pool owner!');
      console.error('Only the wallet that created the pool can update it.');
    } else if (error.message?.includes('POOL_NOT_EXISTS')) {
      console.error('');
      console.error(`Pool ID ${poolId} does not exist on the contract.`);
      console.error('Check the pool ID in your database.');
    }

    process.exit(1);
  }
}

updatePoolDuration();
