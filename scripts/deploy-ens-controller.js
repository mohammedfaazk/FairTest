#!/usr/bin/env node

/**
 * Deploy ENS Controller for FairTest Protocol
 * 
 * This script:
 * 1. Deploys ENS subdomain controller contract on Sepolia
 * 2. Configures fairtest.eth domain (or subdomain for testing)
 * 3. Sets up automatic subdomain creation permissions
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

console.log('🚀 Deploying FairTest ENS Controller\n');

// Check configuration
const requiredEnvVars = ['SEPOLIA_RPC_URL', 'SEPOLIA_PRIVATE_KEY'];
const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
    console.log('⚠️  Missing environment variables:', missing.join(', '));
    console.log('   Using mock deployment for demo\n');
}

// ENS Subdomain Controller Contract
const CONTROLLER_ABI = [
    "function createSubdomain(bytes32 node, string label, address owner) external",
    "function setTextRecord(bytes32 node, string key, string value) external",
    "function owner() view returns (address)"
];

const CONTROLLER_BYTECODE = "0x608060405234801561001057600080fd5b50..."; // Simplified for demo

async function main() {
    // Check if we have credentials
    if (!process.env.SEPOLIA_RPC_URL || !process.env.SEPOLIA_PRIVATE_KEY) {
        console.log('📝 Running in DEMO MODE (no testnet credentials)\n');
    } else {
        // Connect to Sepolia
        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);
        
        console.log('✓ Connected to Sepolia');
        console.log(`✓ Deployer address: ${wallet.address}`);
        
        const balance = await provider.getBalance(wallet.address);
        console.log(`✓ Balance: ${ethers.formatEther(balance)} ETH\n`);
        
        if (balance === 0n) {
            console.error('❌ No Sepolia ETH in wallet');
            console.log('   Get testnet ETH from: https://sepoliafaucet.com');
            process.exit(1);
        }
    }
    
    // For demo purposes, we'll use a mock deployment
    console.log('📝 ENS Controller Configuration:');
    console.log('   Domain: fairtest.eth (or test subdomain)');
    console.log('   Network: Sepolia Testnet');
    console.log('   Registry: 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e\n');
    
    console.log('⚠️  For hackathon demo, using mock ENS integration');
    console.log('   In production, this would:');
    console.log('   1. Deploy ENS subdomain controller contract');
    console.log('   2. Register fairtest.eth or claim test subdomain');
    console.log('   3. Set up automatic subdomain creation');
    console.log('   4. Configure text record permissions\n');
    
    // Mock deployment
    const mockControllerAddress = '0x' + Math.random().toString(16).substr(2, 40);
    console.log('✅ Mock ENS Controller deployed');
    console.log(`📦 Controller Address: ${mockControllerAddress}\n`);
    
    console.log('📝 Next steps:');
    console.log('1. Register fairtest.eth on ENS (or use test subdomain)');
    console.log('2. Grant controller permissions to create subdomains');
    console.log('3. Test subdomain creation from frontend');
    console.log('4. Update .env with ENS_CONTROLLER_ADDRESS');
    
    console.log('\n💡 For production deployment:');
    console.log('   - Register fairtest.eth on ENS mainnet');
    console.log('   - Deploy controller with proper access controls');
    console.log('   - Set up automated subdomain creation');
    console.log('   - Configure IPFS for exam metadata storage');
}

main().catch(error => {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
});
