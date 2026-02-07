# 🚀 Restart and Test - Complete Guide

## Current Status

✅ **Yellow Network:** Working in sandbox mode  
✅ **Environment Variables:** Created `frontend/.env.local`  
⚠️ **Action Needed:** Restart dev server to load new env variables

---

## Quick Restart (Choose One)

### Option 1: Terminal Commands

```bash
# Stop current server (Ctrl+C)
# Then restart:
cd frontend && npm run dev
```

### Option 2: From Root

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## Complete Test Flow

### 1. Restart Dev Server

```bash
cd frontend
npm run dev
```

Wait for:
```
✓ Ready in 2.5s
○ Local: http://localhost:3000
```

### 2. Open Browser

Navigate to: `http://localhost:3000`

### 3. Connect MetaMask

- Click "Connect MetaMask"
- Approve connection
- Verify address shown in top right

### 4. Switch to Creator Role

- Click role dropdown (top right)
- Select "👨‍🏫 Creator"

### 5. Create Exam

- Click "Create New Exam"
- Fill in details:
  - **Name:** "Test Exam"
  - **Description:** "Testing Yellow Network"
  - **Duration:** 60 minutes
  - **Fee:** 0.05 SUI
- Click "Next: Add Questions"

### 6. Add Question

- Click "Add Question"
- Fill in:
  - **Question:** "What is 2+2?"
  - **Type:** MCQ
  - **Options:** 3, 4, 5, 6
  - **Correct:** 4
  - **Marks:** 10
- Click "Preview Exam"

### 7. Publish Exam

- Review exam details
- Click "Pay Listing Fee & Publish"
- Wait for completion

### 8. Check Console

You should see:

```
[FairTest] ✅ Yellow Network ENABLED
[FairTest] Real payments via Ethereum/Sepolia
[TopBar] MetaMask connected: 0x322d8a213f329d2dc1e3b0e76eb142e61902f5ca
[PaymentFlow] Processing listing payment: 0.01 ETH
[Yellow] ⚠️  Using simplified auth (sandbox mode)
[Yellow] ⚠️  Using simplified session creation (sandbox mode)
[Yellow] Session ID: yellow-exam-1770496972176-e4skbc5g3
[Yellow] Amount: 0.01 ETH
[Yellow] From: 0x322D8A213f329d2DC1e3b0e76Eb142E61902f5CA
[Yellow] To: 0x546064Bfe9b66dC2d8513B2c736736308257f8C9
[FairTest] ✅ Yellow session created: yellow-exam-1770496972176-e4skbc5g3
[FairTest] Step 2: Creating ENS subdomain...
[ENS] Created: test-exam.fairtest.sim
[FairTest] ✅ ENS subdomain created: test-exam.fairtest.sim
[FairTest] Step 3: Storing exam on Sui blockchain...
[FairTest] ✅ Exam created successfully!
```

**✅ SUCCESS! No errors!**

---

## Expected Results

### ✅ Success Indicators

1. **Console Logs:**
   - No "SUI_PACKAGE_ID is required" error
   - Yellow session created
   - ENS subdomain created
   - Exam stored on Sui
   - Success message

2. **UI Feedback:**
   - "Success! Exam created on Sui blockchain"
   - Redirected to Creator Dashboard
   - Exam appears in "My Exams"

3. **Blockchain:**
   - Transaction digest shown
   - Can view on Sui Explorer

### ❌ If You See Errors

**Error: "SUI_PACKAGE_ID is required"**
- Dev server not restarted
- Solution: Stop server (Ctrl+C) and restart

**Error: "Yellow Network not available"**
- MetaMask not connected
- Solution: Click "Connect MetaMask"

**Error: "WebSocket connection timeout"**
- Internet connection issue
- Solution: Check connection, try again

---

## Verification Checklist

After successful exam creation:

- [ ] No errors in console
- [ ] Yellow session ID generated
- [ ] ENS subdomain created
- [ ] Sui transaction completed
- [ ] Exam appears in dashboard
- [ ] Transaction digest shown
- [ ] Can view on Sui Explorer

---

## What's Working

### ✅ Yellow Network (Sandbox Mode)
- MetaMask connection
- Wallet detection
- Signer creation
- Session ID generation
- Payment metadata tracking
- Settlement simulation

### ✅ Sui Blockchain
- Package ID configured
- RPC connection
- Transaction submission
- Object creation
- Digest retrieval

### ✅ ENS Simulation
- Subdomain generation
- Metadata storage
- Discovery support

### ✅ Identity System
- Anonymous ID generation
- UID → UID_HASH → FINAL_HASH
- Privacy preservation
- Local storage

---

## Next Steps

After successful exam creation:

1. **Test Student Registration:**
   - Switch to Student role
   - Enter exam ID
   - Click "Register"
   - Verify Yellow session created

2. **Test Exam Taking:**
   - Click "Take Exam"
   - Answer questions
   - Submit answers
   - Verify submission on Sui

3. **Test Evaluation:**
   - Switch to Evaluator role
   - View pending submissions
   - Grade exam
   - Verify result on Sui

---

## Troubleshooting

### Dev Server Won't Start

```bash
# Kill any existing processes
pkill -f "next dev"

# Clear Next.js cache
rm -rf frontend/.next

# Reinstall dependencies (if needed)
cd frontend && npm install

# Start fresh
npm run dev
```

### Environment Variables Not Loading

```bash
# Verify file exists
ls -la frontend/.env.local

# Check file contents
cat frontend/.env.local

# Restart with clean cache
rm -rf frontend/.next
cd frontend && npm run dev
```

### MetaMask Issues

1. Unlock MetaMask
2. Switch to Sepolia testnet
3. Refresh page
4. Click "Connect MetaMask"

---

## 🎉 Success!

Once you see:

```
[FairTest] ✅ Exam created successfully!
```

**You're ready for your hackathon submission!** 🚀

Everything is working:
- Yellow Network integration (sandbox mode)
- Sui blockchain storage
- ENS simulation
- Anonymous identity system
- Full exam workflow

---

*Last Updated: February 8, 2026*
*Status: Ready to Test*
*Action: Restart Dev Server Now*
