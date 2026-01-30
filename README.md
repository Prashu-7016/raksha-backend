# SafeSpace - Privacy-First Women's Safety App

## 🛡️ Overview

SafeSpace is a **privacy-first**, **anonymous** mobile application for women's safety that uses a **crypto-style authentication system** with NO personal data collection.

**Core Principle**: Security > Convenience

---

## 🔐 Authentication System

### Seed Phrase Generation (BIP-39)
- 12-word mnemonic generated on device
- Displayed ONCE during registration
- User must confirm 3 random words to verify they saved it
- **WARNING**: Lost seed phrase = permanent account loss (NO recovery)

### Security Architecture
- Hash: SHA-256(seed_phrase + device_salt)
- Device salt: Unique per device, stored in secure storage
- Backend stores ONLY: `user_id`, `hash`, `created_at`
- NO storage of: email, phone, name, seed words, or any PII

### Login Flow
1. User enters 12-word seed phrase
2. App generates hash with device salt
3. Backend validates hash
4. Returns user_id on success

---

## 📍 Incident Reporting

### Anonymous Reports
Users can submit incident reports with:
- **GPS Location**: Rounded to ~100m for privacy
- **Category**: harassment, stalking, unsafe_crowd, eve_teasing, suspicious_activity, other
- **Severity**: 1-5 scale (minor to critical)
- **Description**: Optional text (max 500 chars)

### Privacy Protection
- Reports linked to user_id during submission
- After AI moderation approval, user_id is **removed** (anonymized)
- Reports become permanently anonymous and untraceable

---

## 🗺️ Map Visualization

### Features
- **Real-time heatmap** of incidents
- **Danger zones** marked with colored circles
- **Risk score** for current location (high/medium/low/safe)
- **Time-decay weighting**: Recent incidents have higher weight
- **Category-based filtering**: View specific types of incidents

### Geospatial Queries
- MongoDB 2dsphere index for efficient queries
- Radius-based incident search
- Zone clustering for danger area detection

---

## 🤖 AI Moderation (Gemini)

### Content Filtering
- Automated spam detection
- False report identification
- Abusive language filtering
- Duplicate detection

### Moderation Flow
1. Report submitted → Status: "pending"
2. Gemini AI analyzes content
3. Decision: approved/rejected
4. If approved → user_id removed (anonymized)
5. Report added to public map

---

## 🏗️ Tech Stack

### Frontend (React Native + Expo)
- **expo-router**: File-based navigation
- **expo-location**: GPS tracking
- **react-native-maps**: Map visualization
- **expo-secure-store**: Secure seed hash storage
- **bip39**: Seed phrase generation
- **expo-crypto**: SHA-256 hashing

### Backend (FastAPI)
- **Motor**: Async MongoDB driver
- **emergentintegrations**: Gemini AI integration
- **Geospatial indexing**: MongoDB 2dsphere
- **Background tasks**: Async moderation

### Database (MongoDB)
```javascript
// users collection
{
  user_id: UUID,
  hash: SHA-256,
  device_salt: string,
  created_at: timestamp,
  last_login: timestamp
}

// incidents collection
{
  incident_id: UUID,
  user_id: UUID | null,  // Removed after moderation
  location: GeoJSON Point,
  rounded_location: GeoJSON Point,
  category: string,
  severity: 1-5,
  description: string,
  moderation_status: "pending|approved|rejected",
  confidence_score: 0-1,
  is_anonymous: boolean,
  timestamp: datetime
}
```

---

## 🚀 API Endpoints

### Authentication
- `POST /api/auth/register` - Register with seed hash
- `POST /api/auth/login` - Login with seed hash

### Incidents
- `POST /api/incidents/report` - Submit incident report
- `POST /api/incidents/heatmap` - Get heatmap data for bounds
- `GET /api/incidents/risk-score` - Get risk score for location
- `POST /api/zones/danger-zones` - Get danger zones in area

### Health
- `GET /api/health` - Service health check

---

## 🎯 Key Features

### ✅ Implemented
1. **BIP-39 Seed Phrase System**
   - 12-word generation
   - Verification flow
   - Secure hashing

2. **Anonymous Authentication**
   - No email/phone/OTP
   - Hash-only storage
   - Device-bound security

3. **Incident Reporting**
   - GPS location capture
   - Category selection (6 types)
   - Severity rating (1-5)
   - Optional description

4. **Map Visualization**
   - OpenStreetMap integration
   - Heatmap overlay
   - Danger zone circles
   - Risk score display

5. **AI Moderation**
   - Gemini integration
   - Spam detection
   - Auto-approval logic

6. **Privacy Features**
   - Location rounding
   - Post-moderation anonymization
   - No PII collection

### 🔄 Future Enhancements
1. **Geofencing Alerts**
   - Background location tracking
   - Silent notifications when entering danger zones
   - Configurable alert radius

2. **Community Features**
   - Verified safe routes
   - Escort request system
   - Emergency contacts (stored locally only)

3. **Advanced Analytics**
   - Time-of-day risk patterns
   - Category-specific heatmaps
   - Predictive risk modeling

4. **Accessibility**
   - Quick panic button
   - Voice-activated reporting
   - Emergency mode (disguised UI)

---

## 🔒 Security Considerations

### Device-Level
- Seed phrase shown ONCE only
- Clipboard cleared after 60 seconds
- Secure storage (iOS Keychain, Android Keystore)
- No screenshot capability in sensitive screens

### Network-Level
- HTTPS everywhere
- No IP logging
- Rate limiting on endpoints
- CORS protection

### Data-Level
- Hash-only authentication
- No plaintext passwords
- Geolocation rounding
- Post-approval anonymization

---

## 📱 Mobile Permissions

### iOS (Info.plist)
- `NSLocationWhenInUseUsageDescription`: "Access location to report and view safety incidents nearby"
- `NSLocationAlwaysUsageDescription`: "Monitor location to alert you when entering high-risk areas"

### Android (AndroidManifest.xml)
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION` (for geofencing)

---

## 🧪 Testing Checklist

### Authentication Flow
- [ ] Generate seed phrase (12 words)
- [ ] Verify word confirmation (3 random words)
- [ ] Test registration with backend
- [ ] Test login with correct seed phrase
- [ ] Test login with incorrect seed phrase
- [ ] Test clipboard clearing after 60s

### Incident Reporting
- [ ] Request location permission
- [ ] Get current GPS coordinates
- [ ] Select incident category
- [ ] Set severity level (1-5)
- [ ] Add optional description
- [ ] Submit report to backend
- [ ] Verify moderation status

### Map Features
- [ ] Display user location
- [ ] Load heatmap data for visible area
- [ ] Show danger zones with risk colors
- [ ] Display risk score for current location
- [ ] Refresh location button
- [ ] Center map on user location

### AI Moderation
- [ ] Submit legitimate report → Approved
- [ ] Submit spam text → Rejected
- [ ] Verify user_id removed after approval
- [ ] Check moderation logs

---

## 🌐 Deployment Notes

### Environment Variables
**Backend (.env)**
```bash
MONGO_URL=<mongodb_connection_string>
DB_NAME=local
EMERGENT_LLM_KEY=sk-emergent-3BfE872AaD4Bc7f4bD
```

**Frontend (.env)**
```bash
EXPO_PUBLIC_BACKEND_URL=<backend_url>
```

### MongoDB Setup
- Create 2dsphere indexes on `location` and `rounded_location`
- Configure geospatial queries
- Set up backup/restore procedures

### Mobile Build
```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

---

## 📊 Scalability Plan

### Database
- Shard by geographic region
- Archive old incidents (>6 months)
- Implement time-decay scoring

### Backend
- Horizontal scaling with load balancer
- Redis caching for frequently accessed areas
- Background job queue for moderation

### Frontend
- Lazy loading for map markers
- Virtual scrolling for lists
- Optimized image sizes

---

## 🤝 Contributing

This is a production-ready MVP focused on:
1. True anonymity (no PII)
2. Privacy-first architecture
3. Real-world safety utility
4. Scalable design

Target launch: **India first**, then global expansion.

---

## ⚠️ Important Disclaimers

1. **No Recovery**: Lost seed phrase = permanent account loss
2. **Anonymous Reports**: Cannot be traced back to user after moderation
3. **Location Privacy**: Coordinates rounded to ~100m accuracy
4. **AI Moderation**: May occasionally flag legitimate reports
5. **Data Retention**: Reports older than 6 months are archived

---

## 📞 Support

For issues or questions:
- Check troubleshooting guide
- Review API documentation
- Test with curl commands
- Verify MongoDB indexes

---

**Built with security, privacy, and safety as top priorities.**
