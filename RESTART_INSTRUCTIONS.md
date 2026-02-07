# 🚀 Restart Instructions - Real Transactions Ready

## Critical Changes Made

1. **Wallet Integration**: Browser now uses connected wallet to sign transactions
2. **Transaction Signing**: Real-time wallet approval for all blockchain operations
3. **Payment Flow**: Actual SUI transfers on testnet

## Restart Steps

### 1. Stop Current Dev Server
```bash
# Press Ctrl+C in the terminal running the dev server
```

### 2. Clear Browser Cache
- **Chrome/Edge**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- **Firefox**: Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows)
- Or use Incognito/Private mode

### 3. Restart Dev Server
```bash
cd frontend
npm run dev
```

### 4. Test Transaction Flow

#### A. Connect Wallet
1. Open http://localhost:3000
2. Click "Connect Wallet" in top-right
3. Select your Sui wallet
4. Approve connection

#### B. Create Exam (Test Real Transaction)
1. Switch to "Creator" role
2. Click "Create New Exam"
3. Fill in:
   - Name: "Test Exam"
   - Description: "Testing real transactions"
   - Fee: 0.1 SUI
   - Duration: 30 minutes
   - Add 1-2 questions
4. Click "Publish Exam"
5. **WALLET POPUP WILL APPEAR** ⚠️
   - Review transaction details
   - Platform fee: 0.01 SUI
   - Gas fee: ~0.001 SUI
   - Click "Approve"
6. Wait for confirmation (5-10 seconds)
7. Check console for transaction digest

#### C. Verify on Blockchain
```bash
# Copy transaction digest from console
# Visit: https://suiscan.xyz/testnet/tx/{YOUR_TX_DIGEST}
```

## What to Expect

### ✅ Success Indicators:
- Wallet popup appears when creating exam
- Transaction confirmed in console
- Exam appears in "My Exams"
- Transaction visible on Sui Explorer
- Real SUI deducted from wallet

### ❌ If Something Goes Wrong:

**"Wallet not connected"**
- Refresh page
- Reconnect wallet
- Check wallet extension is unlocked

**"Insufficient balance"**
- Get testnet SUI from Discord: https://discord.gg/sui
- Command: `!faucet {your_address}`

**"Transaction failed"**
- Check console for error details
- Verify package ID is correct
- Try with lower gas budget

**"Package not found"**
- Restart dev server
- Clear browser cache completely
- Check .env.local has correct NEXT_PUBLIC_SUI_PACKAGE_ID

## Console Logs to Watch For

### Good Signs:
```
[FairTest] Wallet instance connected for transaction signing
[Sui] Signing with connected wallet...
[Sui] Transferring platform fee: 0.01 SUI to 0x97ddf...
[Sui] ✅ Exam stored on blockchain: 0x...
[Sui] ✅ Platform fee paid: 0.01 SUI
[Sui] Tx digest: ABC123...
```

### Bad Signs:
```
[Sui] Transaction error: ...
Missing transaction sender
Insufficient balance
Package object does not exist
```

## Quick Verification Test

Run this to verify configuration:
```bash
node test-sui-transaction.js
```

Should show:
```
✅ Package exists
✅ Private key valid
✅ Balance: X.XX SUI
✅ Transaction constructed successfully
✅ Dry run successful!
✅ All checks passed!
```

## Emergency Reset

If nothing works:
```bash
# 1. Stop dev server
# 2. Clear all caches
rm -rf frontend/.next
rm -rf node_modules/.cache

# 3. Restart
cd frontend
npm run dev
```

## Support Checklist

Before asking for help, verify:
- [ ] Dev server restarted
- [ ] Browser cache cleared
- [ ] Wallet connected and unlocked
- [ ] Testnet SUI balance > 0.1
- [ ] Console shows wallet instance connected
- [ ] Package ID matches Published.toml

---

**Ready to test?** Follow steps above and watch for wallet popup! 🎉
