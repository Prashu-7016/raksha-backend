# SafeSpace - Testing Guide

## ⚠️ Important Note

**react-native-maps** does NOT work on web preview. This is a native mobile library that requires:
- **Physical Android device** with Expo Go app
- **Physical iOS device** with Expo Go app
- **iOS Simulator** (Mac only)
- **Android Emulator**

Web preview will show an error - this is expected and normal for mobile-only apps.

---

## 🧪 Backend Testing (✅ COMPLETED)

### Test Results Summary

All backend endpoints tested successfully with curl:

```bash
✅ Health Check - Working
✅ User Registration (BIP-39 hash) - Working  
✅ User Login (hash validation) - Working
✅ Incident Reporting (GPS + AI moderation) - Working
✅ Risk Score Calculation - Working
✅ Heatmap Data (geospatial) - Working
✅ Danger Zones - Working
```

### Manual Testing Commands

```bash
# 1. Health Check
curl -X GET http://localhost:8001/api/health

# 2. Register User
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "seed_hash": "test_hash_123456",
    "device_salt": "device_salt_789"
  }'

# 3. Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "seed_hash": "test_hash_123456",
    "device_salt": "device_salt_789"
  }'

# 4. Report Incident (New Delhi coordinates)
curl -X POST http://localhost:8001/api/incidents/report \
  -H "Content-Type: application/json" \
  -d '{
    "seed_hash": "test_hash_123456",
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090
    },
    "category": "harassment",
    "severity": 4,
    "description": "Test incident"
  }'

# 5. Get Risk Score
curl "http://localhost:8001/api/incidents/risk-score?lat=28.6139&lng=77.2090&radius_km=1.0"

# 6. Get Heatmap
curl -X POST http://localhost:8001/api/incidents/heatmap \
  -H "Content-Type: application/json" \
  -d '{
    "min_lat": 28.5,
    "max_lat": 28.7,
    "min_lng": 77.1,
    "max_lng": 77.3
  }'
```

---

## 📱 Frontend Testing (Mobile Device Required)

### Prerequisites

1. **Install Expo Go App**:
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

2. **Scan QR Code**:
   - Look for QR code in Expo preview
   - Scan with Expo Go app camera
   - App will load on your device

### Test Flow on Device

#### 1. Welcome Screen
- [ ] App opens to welcome screen
- [ ] "SafeSpace" title visible
- [ ] Feature list displayed
- [ ] "Create Account" button works
- [ ] "I Have a Seed Phrase" button works

#### 2. Registration Flow
- [ ] Generate seed phrase (12 words)
- [ ] Copy to clipboard works
- [ ] Words display in grid format
- [ ] Proceed to confirmation
- [ ] Enter 3 random words correctly
- [ ] Account created successfully
- [ ] Navigate to map screen

#### 3. Map Screen
- [ ] Location permission requested
- [ ] Map loads with user location
- [ ] Risk score card displays
- [ ] "Report Incident" button visible
- [ ] Refresh location works
- [ ] Center map on user works

#### 4. Incident Reporting
- [ ] Tap "Report Incident"
- [ ] Location captured automatically
- [ ] Select category (harassment, stalking, etc.)
- [ ] Set severity (1-5)
- [ ] Add optional description
- [ ] Submit report
- [ ] Success message shown
- [ ] Return to map

#### 5. Logout & Login
- [ ] Open menu
- [ ] Logout
- [ ] Return to welcome screen
- [ ] Click "I Have a Seed Phrase"
- [ ] Enter 12 words
- [ ] Login successful
- [ ] Return to map

---

## 🔐 Security Testing Checklist

### Authentication
- [ ] Seed phrase generated with 12 words (BIP-39)
- [ ] Hash stored in secure storage
- [ ] Original seed phrase NOT stored
- [ ] Login fails with wrong seed phrase
- [ ] Device salt unique per device

### Privacy
- [ ] No email/phone collected
- [ ] GPS coordinates rounded (3 decimals)
- [ ] Reports anonymized after moderation
- [ ] user_id removed from approved incidents
- [ ] No IP logging

### Data Validation
- [ ] Seed phrase validation (BIP-39 standard)
- [ ] Category restricted to allowed values
- [ ] Severity range 1-5 enforced
- [ ] Description max 500 characters
- [ ] Coordinates validated

---

## 🤖 AI Moderation Testing

### Gemini Integration
```python
# Test moderation with different inputs
legitimate_report = "Woman followed by suspicious man in dark alley"
spam_report = "Buy cheap watches now!!!"
abusive_report = "This is spam content with inappropriate language"
```

### Expected Results
- Legitimate safety report → **Approved** (user_id removed)
- Spam content → **Rejected** (flagged as spam)
- Abusive language → **Rejected** (flagged as inappropriate)

### Verify in Database
```javascript
// Check moderation status
db.incidents.find({ moderation_status: "approved" })

// Verify anonymization (user_id should be null)
db.incidents.find({ 
  moderation_status: "approved",
  user_id: null 
})
```

---

## 📊 Performance Testing

### Database Queries
```javascript
// Check index usage
db.incidents.find({ location: { $near: { ... }}}).explain()

// Should use: 2dsphere index

// Check query time
db.incidents.find({ 
  moderation_status: "approved" 
}).explain("executionStats")
```

### API Response Times
- Auth endpoints: < 200ms
- Incident report: < 500ms (excluding AI moderation)
- Heatmap query: < 1000ms
- Risk score: < 500ms

---

## 🐛 Known Issues & Limitations

### Web Preview
- ❌ react-native-maps doesn't work on web
- ✅ Use physical device or emulator for testing

### Location Services
- Requires physical device with GPS
- Simulators can simulate locations
- Web browsers have limited location accuracy

### Expo Version Warnings
- Package version mismatches shown (normal for Expo)
- App functionality not affected
- Can be ignored for MVP testing

---

## 📝 Production Deployment Notes

### Before Launch

1. **App Store Preparation**
   - Update app icons
   - Add splash screen branding
   - Write app description
   - Add screenshots (5-8 required)
   - Privacy policy URL

2. **Backend Infrastructure**
   - Configure production MongoDB cluster
   - Set up Redis cache
   - Enable CDN for static assets
   - Configure autoscaling

3. **Security Hardening**
   - Enable rate limiting
   - Add DDoS protection
   - Configure firewall rules
   - Set up SSL certificates
   - Implement request validation

4. **Monitoring Setup**
   - Error tracking (Sentry)
   - Performance monitoring (Datadog/New Relic)
   - Uptime monitoring (Pingdom)
   - Database monitoring
   - Log aggregation

---

## 🚀 Build Commands

### Development Build (EAS)
```bash
cd /app/frontend

# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

### Production Build
```bash
# iOS (requires Apple Developer account)
eas build --profile production --platform ios

# Android
eas build --profile production --platform android
```

### Submit to Stores
```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: "Location permission denied"
- **Solution**: Go to device Settings → Apps → SafeSpace → Permissions → Enable Location

**Issue**: "Failed to connect to backend"
- **Solution**: Check EXPO_PUBLIC_BACKEND_URL in .env file

**Issue**: "Seed phrase invalid"
- **Solution**: Ensure all 12 words are entered correctly, separated by spaces

**Issue**: "Map not loading"
- **Solution**: Check internet connection and location permissions

### Debug Logs

**Backend Logs**:
```bash
sudo supervisorctl tail -f backend
```

**Frontend Logs**:
```bash
# Visible in Expo Go app
# Shake device → Dev menu → Show Performance Monitor
```

---

## ✅ Final Testing Checklist

### Backend
- [x] All API endpoints working
- [x] MongoDB geospatial indexes created
- [x] Gemini AI moderation integrated
- [x] CORS configured
- [x] Error handling implemented

### Frontend  
- [x] Authentication flow implemented
- [x] Map visualization ready
- [x] Incident reporting UI complete
- [x] Location permissions configured
- [ ] Tested on physical device (user to verify)

### Security
- [x] No PII collection
- [x] Hash-only authentication
- [x] Location rounding
- [x] Post-approval anonymization
- [x] Secure storage (iOS Keychain/Android Keystore)

### Documentation
- [x] README.md complete
- [x] ARCHITECTURE.md detailed
- [x] API documentation
- [x] Testing guide

---

**MVP Status**: ✅ **READY FOR DEVICE TESTING**

**Next Steps**: 
1. Test on physical Android/iOS device
2. Verify full user journey
3. Test AI moderation with real reports
4. Deploy to production
