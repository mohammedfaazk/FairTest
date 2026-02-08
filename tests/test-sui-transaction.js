#!/usr/bin/env node
/**
 * Test Sui Transaction - Verify everything is configured correctly
 */

import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui.js/cryptography';
import dotenv from 'dotenv';

dotenv.config();

const PACKAGE_ID = process.env.SUI_PACKAGE_ID;
const PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;
const RPC_URL = process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';
const PLATFORM_WALLET = process.env.PLATFORM_WALLET_ADDRESS;

console.log('🔍 Testing Sui Configuration\n');
console.log('Package ID:', PACKAGE_ID);
console.log('RPC URL:', RPC_URL);
console.log('Platform Wallet:', PLATFORM_WALLET);

async function main() {
    // 1. Verify package exists
    console.log('\n1️⃣ Verifying package exists on chain...');
    const client = new SuiClient({ url: RPC_URL });
    
    try {
        const pkg = await client.getObject({
            id: PACKAGE_ID,
            options: { showType: true }
        });
        
        if (pkg.error) {
            console.error('❌ Package not found:', pkg.error);
            process.exit(1);
        }
        
        console.log('✅ Package exists:', pkg.data.objectId);
        console.log('   Type:', pkg.data.type);
    } catch (error) {
        console.error('❌ Error fetching package:', error.message);
        process.exit(1);
    }

    // 2. Verify private key and get address
    console.log('\n2️⃣ Verifying private key...');
    if (!PRIVATE_KEY) {
        console.error('❌ SUI_PRIVATE_KEY not set');
        process.exit(1);
    }

    let signer;
    try {
        const { secretKey } = decodeSuiPrivateKey(PRIVATE_KEY);
        signer = Ed25519Keypair.fromSecretKey(secretKey);
        const address = signer.toSuiAddress();
        console.log('✅ Private key valid');
        console.log('   Address:', address);
        
        // 3. Check balance
        console.log('\n3️⃣ Checking balance...');
        const balance = await client.getBalance({ owner: address });
        const suiBalance = Number(balance.totalBalance) / 1e9;
        console.log('✅ Balance:', suiBalance, 'SUI');
        
        if (suiBalance < 0.1) {
            console.warn('⚠️  Low balance! Get testnet SUI from: https://discord.gg/sui');
        }
    } catch (error) {
        console.error('❌ Invalid private key:', error.message);
        process.exit(1);
    }

    // 4. Test transaction construction (dry run)
    console.log('\n4️⃣ Testing transaction construction...');
    try {
        const tx = new TransactionBlock();
        tx.setGasBudget(100000000);
        
        // Test platform fee transfer
        const platformFee = BigInt(Math.floor(0.01 * 1e9));
        const [coin] = tx.splitCoins(tx.gas, [tx.pure(platformFee)]);
        tx.transferObjects([coin], tx.pure(PLATFORM_WALLET));
        
        // Test exam creation call
        const examIdStr = `test_exam_${Date.now()}`;
        const examIdBytes = Array.from(new TextEncoder().encode(examIdStr));
        
        const { bcs } = await import('@mysten/sui.js/bcs');
        
        tx.moveCall({
            target: `${PACKAGE_ID}::exam::create_exam`,
            arguments: [
                tx.pure(bcs.vector(bcs.U8).serialize(examIdBytes)),
                tx.pure.string('Test Exam'),
                tx.pure.u64(BigInt(1000000000)), // 1 SUI
                tx.object('0x6') // Clock object
            ]
        });
        
        console.log('✅ Transaction constructed successfully');
        
        // Dry run to check if it would succeed
        console.log('\n5️⃣ Running dry-run simulation...');
        tx.setSender(signer.toSuiAddress());
        const dryRunResult = await client.dryRunTransactionBlock({
            transactionBlock: await tx.build({ client })
        });
        
        if (dryRunResult.effects.status.status === 'success') {
            console.log('✅ Dry run successful! Transaction would succeed.');
        } else {
            console.error('❌ Dry run failed:', dryRunResult.effects.status.error);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Transaction construction failed:', error.message);
        console.error(error);
        process.exit(1);
    }

    console.log('\n✅ All checks passed! Ready for real transactions.\n');
}

main().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
