# How to Create an Account on SafeSpace

## 📱 Registration Steps

### Step 1: Click "Create Account"
On the welcome screen, click the purple **"Create Account"** button.

### Step 2: Save Your Seed Phrase
You'll see **12 words** displayed in a grid. These are your account credentials.

**⚠️ CRITICAL: Write these down on paper!**

Example words shown:
```
1. excuse      2. finish      3. rule
4. october     5. spider      6. item  
7. dog         8. frame       9. nest
10. roof       11. inner      12. enrich
```

### Step 3: Click "I've Written It Down"
After saving your words, click the purple button at the bottom.

### Step 4: Verify 3 Words
The app will ask you to enter **3 specific words** from your list:
- **Word #3** (in example above: "rule")
- **Word #7** (in example above: "dog")
- **Word #11** (in example above: "inner")

Type these words exactly as shown (lowercase, no extra spaces).

### Step 5: Click "Create Account"
After entering all 3 words correctly, click the purple **"Create Account"** button.

### Step 6: Success!
Your account will be created and you'll be redirected to the map screen.

---

## 🔐 Security Notes

- **NO recovery possible** - If you lose your seed phrase, your account is permanently lost
- **NO email or phone** - Your seed phrase is your only credential
- The app uses **BIP-39 standard** (same as crypto wallets)
- Your seed phrase is **NEVER sent to the server** - only a hash is stored

---

## 🐛 Troubleshooting

### "Incorrect words" error
- Make sure you're entering the **exact words** from positions #3, #7, and #11
- Check for typos or extra spaces
- Words should be all lowercase

### Can't see the seed words
- Refresh the page and try again
- Make sure JavaScript is enabled in your browser

### Account creation seems stuck
- Check the browser console for errors (F12)
- Verify backend is running: `curl http://localhost:8001/api/health`
- Check expo logs: `sudo supervisorctl tail expo`

---

## ✅ What Happens After Registration

Once registered successfully:
1. Your seed phrase hash is stored securely
2. You're logged in automatically  
3. On web: You'll see a message about mobile-only features
4. On mobile device: Full map, GPS, and reporting features work

---

## 📱 Testing on Mobile

**For full functionality**, use a mobile device:

1. Install **Expo Go** app:
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

2. Scan the QR code from Expo preview

3. Complete registration on mobile

4. Access full features:
   - Live map with GPS
   - Incident reporting
   - Heatmaps and danger zones
   - Real-time risk scores

---

**Need help?** Check `/app/TESTING.md` for detailed testing instructions.
