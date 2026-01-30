# Location "Not Available" - Troubleshooting Guide

## 🔍 Common Causes & Solutions

### 1. **Web Browser Testing**
**Problem**: You're testing on web (localhost:3000)
**Why**: GPS/location APIs have limited functionality in web browsers
**Solution**: 
- ✅ Test on **physical mobile device** with Expo Go app
- ✅ Use Android Emulator or iOS Simulator

**Web Behavior**:
- Browser will show "Mobile App Required" message
- This is **expected and correct**
- Maps are mobile-only features

---

### 2. **Location Services Disabled**
**Problem**: Location services are turned off on your device
**Solution Android**:
1. Open **Settings** → **Location**
2. Turn ON "Use location"
3. Ensure "High accuracy" mode is selected
4. Restart the app

**Solution iOS**:
1. Open **Settings** → **Privacy & Security** → **Location Services**
2. Turn ON "Location Services"
3. Find "Expo Go" and set to "While Using the App"
4. Restart the app

---

### 3. **Permission Not Granted**
**Problem**: You denied location permission to the app
**Solution Android**:
1. Long-press the Expo Go app icon
2. Tap "App info"
3. Tap "Permissions"
4. Set "Location" to "Allow only while using the app"
5. Restart the app

**Solution iOS**:
1. Open **Settings** → **Expo Go**
2. Tap "Location"
3. Select "While Using the App" or "Always"
4. Restart the app

---

### 4. **GPS Signal Issues**
**Problem**: Device can't get GPS fix
**Symptoms**:
- "Location timeout" error
- Takes very long to load

**Solutions**:
- Move to an area with clear view of sky
- Move away from tall buildings
- Turn OFF Wi-Fi (force GPS mode)
- Wait 30-60 seconds for GPS to acquire satellites
- Try enabling "High accuracy" mode (uses Wi-Fi + GPS)

---

### 5. **Expo Go App Issues**
**Problem**: Expo Go doesn't have location permission
**Solution**:
1. **Uninstall** Expo Go
2. **Reinstall** from Play Store / App Store
3. Scan QR code again
4. Grant location permission when prompted

---

### 6. **Network Connection**
**Problem**: App can't reach backend to load map data
**Check**:
- Are you connected to internet?
- Is backend running? Test: `curl http://localhost:8001/api/health`
- Check firewall settings

---

### 7. **Android Specific Issues**

**Mock Location Enabled**:
- Go to **Developer Options**
- Turn OFF "Mock location app" or "Allow mock locations"

**Battery Saver Mode**:
- Battery saver can disable GPS
- Disable battery saver temporarily

**App in Background**:
- Bring app to foreground
- Some Android versions restrict background location

---

### 8. **iOS Specific Issues**

**Precise Location**:
1. Settings → Expo Go → Location
2. Enable "Precise Location" toggle
3. Without this, accuracy will be very low

**Background App Refresh**:
- Settings → General → Background App Refresh
- Enable for Expo Go

---

## 🛠️ Debug Steps

### Step 1: Check Expo Console
When you open the app, check the Expo console for errors:
```
Getting current location...
Location obtained: {latitude: 28.6139, longitude: 77.2090}
```

If you see errors, note the error code:
- `E_LOCATION_TIMEOUT` → GPS signal issue
- `E_LOCATION_SERVICES_DISABLED` → Enable location services
- `E_LOCATION_UNAVAILABLE` → Try again or restart device

### Step 2: Test in Simulator First
**Android Emulator**:
1. Extended controls (⋮) → Location
2. Set latitude/longitude manually
3. Click "Send"

**iOS Simulator**:
1. Features → Location → Custom Location
2. Enter coordinates (e.g., 28.6139, 77.2090 for Delhi)

### Step 3: Try Physical Device
- Install Expo Go
- Ensure location services ON
- Grant permission when prompted
- Wait for GPS fix (may take 30-60 seconds first time)

---

## 📱 Testing Checklist

Before reporting location issues, verify:

- [ ] Using **physical device** or **simulator** (not web browser)
- [ ] Location services **enabled** in device settings
- [ ] App has location **permission granted**
- [ ] **Internet connection** active
- [ ] GPS signal available (outdoors or near window)
- [ ] **Expo Go app** updated to latest version
- [ ] Device **date/time** set correctly
- [ ] Not in **battery saver mode**
- [ ] Tried **restarting the app**
- [ ] Tried **restarting the device**

---

## 🆘 Still Not Working?

### Get Detailed Error Info:
1. Shake device to open Expo dev menu
2. Enable "Debug Remote JS"
3. Check browser console for detailed errors
4. Note exact error message and code

### Common Error Codes:
```
E_LOCATION_TIMEOUT (code 3)
→ GPS couldn't get fix in time
→ Try outdoors, wait longer

E_LOCATION_SERVICES_DISABLED (code 2)  
→ Location services OFF in settings
→ Enable in Settings → Location

E_LOCATION_UNAVAILABLE (code 1)
→ Temporary GPS issue
→ Wait and retry

Permission denied
→ Check app permissions
→ Reinstall Expo Go if needed
```

---

## ✅ Expected Behavior

**When Working Correctly**:
1. App loads
2. Prompt: "SafeSpace wants to use your location"
3. You tap "Allow"
4. Loading indicator shows
5. Map appears with your blue location dot
6. Risk score card displays
7. Can tap "Report Incident" button

**First Location Fix**:
- May take **30-60 seconds** on first launch
- Faster on subsequent opens
- Requires clear view of sky or Wi-Fi assist

---

## 🔧 Advanced Fixes

### Clear Expo Cache:
```bash
# On computer with Expo project
cd /app/frontend
expo start -c
```

### Reset Location Permissions (Android):
```bash
# Via ADB
adb shell pm clear host.exp.exponent
# This clears all Expo Go data including permissions
```

### iOS Reset:
Settings → General → Reset → Reset Location & Privacy

---

## 📞 If Issue Persists

**Provide This Info**:
1. Device model (e.g., "iPhone 12", "Samsung S21")
2. OS version (e.g., "iOS 17.1", "Android 13")
3. Exact error message
4. Screenshot of error
5. Expo Go version
6. Testing on web/simulator/physical device?

**Check Logs**:
```bash
# Backend logs
sudo supervisorctl tail expo

# Look for location-related errors
```

---

## 💡 Pro Tips

**For Development**:
- Test on **physical device** first (most reliable)
- Use **simulators** with manual location for quick testing
- **iOS Simulator** generally more reliable than Android Emulator for GPS

**For Users**:
- First launch outdoors for best GPS fix
- "While Using" permission is sufficient (don't need "Always")
- App doesn't track location in background (privacy-first)

---

**Most Common Issue**: Testing on web browser instead of mobile device
**Quick Fix**: Scan QR code with Expo Go app on your phone!
