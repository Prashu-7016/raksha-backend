# FAKE-REPORT DETECTION & SAFETY SCORING SYSTEM
## Production-Grade Design for India

---

## 🎯 SYSTEM OVERVIEW

This system implements a **multi-layer defense model** to make fake reports **statistically irrelevant** without blocking users or deleting reports.

### Core Principle
**SIGNAL SYSTEM, NOT VERIFICATION SYSTEM**
- Reports are signals, not verified facts
- Fake reports are down-weighted, not removed
- Area safety emerges from statistical patterns
- Anonymity is preserved at all costs

---

## 🏗️ ARCHITECTURE

### Layer 1: Report Friction
**Purpose**: Deter low-effort spam without harming real users

**Implementation**:
- ✅ Category selection (6 types)
- ✅ Severity level (1-5 mandatory)
- ⚠️ Time window (to be added)
- ✅ Optional description (max 500 chars)
- ❌ NO photo uploads
- ❌ NO mandatory free text

**Code Location**: `/app/frontend/app/incidents/report.tsx`

---

### Layer 2: Confidence Scoring
**Purpose**: Assign trust level to each report (0.0 - 1.0)

**Algorithm**: Multi-factor weighted scoring

**Factors** (with weights):
1. **Corroboration** (35%): Similar reports in same grid
   - 1 report = 0.2 (noise)
   - 3 reports = 0.6 (weak signal)
   - 5+ reports = 0.95 (strong signal)

2. **Historical Pattern** (25%): Matches area patterns
   - New category in area = penalty
   - Common category = boost
   - Severe outlier = penalty

3. **Temporal Spread** (20%): Reports over time, not burst
   - >48 hours spread = 0.95
   - <4 hours burst = 0.2 (suspicious)

4. **Category Diversity** (10%): Diverse incident types
   - High diversity (>60%) = 0.9
   - All same category = 0.3 (suspicious)

5. **Severity Consistency** (10%): Aligns with area history
   - Within 1 std dev = 0.9
   - Outlier (>2 std dev) = 0.3

**Penalties Applied**:
- Burst reporting (>10/hour) = 0.3x multiplier
- Identical repetition (>5 same) = 0.5x multiplier

**Code**: `/app/backend/confidence_engine.py` → `ConfidenceEngine.calculate_confidence()`

**Example**:
```python
# Legitimate report
confidence = 0.35×0.9 + 0.25×0.8 + 0.20×0.95 + 0.10×0.7 + 0.10×0.9
           = 0.315 + 0.20 + 0.19 + 0.07 + 0.09
           = 0.865 (high confidence)

# Fake spam report
confidence = 0.35×0.2 + 0.25×0.3 + 0.20×0.2 + 0.10×0.3 + 0.10×0.3
           = 0.07 + 0.075 + 0.04 + 0.03 + 0.03
           = 0.245 (low confidence)
```

---

### Layer 3: Time-Decay Weighting
**Purpose**: Old reports automatically lose influence

**Formula**: 
```
weight = e^(-days_since / 30)
```

**Decay Schedule**:
- 0 days = 1.000 (full weight)
- 30 days = 0.368 (36.8%)
- 60 days = 0.135 (13.5%)
- 90 days = 0.050 (5.0%)
- 180 days = 0.002 (0.2%)

**Why Exponential**:
- Area reputation can recover naturally
- Old fake reports fade to irrelevance
- No manual cleanup needed
- Matches human memory patterns

**Code**: `/app/backend/confidence_engine.py` → `TimeDecayEngine.calculate_decay_weight()`

---

### Layer 4: Multi-Source Corroboration
**Purpose**: Single reports are noise, multiple reports are signal

**Rules**:
- **1 report** = noise (confidence 0.2)
- **3 similar reports** = weak signal (confidence 0.6)
- **5+ reports** = strong signal (confidence 0.95)

**Corroboration Criteria**:
- Same category
- Within 300m distance
- Within 72 hours
- From different anonymous hashes
- NOT identical (prevents copy-paste spam)

**Anti-Gaming**:
- Reports from same user_hash don't corroborate
- Exact duplicates flagged as suspicious
- Time clustering (all within 1 hour) penalized

**Code**: `/app/backend/risk_scoring.py` → `CorroborationEngine.check_corroboration()`

---

### Layer 5: Pattern Abuse Detection
**Purpose**: Detect coordinated fake reporting attacks

**Spike Detection**:
- **>10 reports/hour in grid** = FREEZE (stop score updates)
- **>5 reports/hour in grid** = REVIEW (flag for admin)
- **>30 reports/day in grid** = MONITOR

**Actions Taken**:
- `FREEZE`: Temporarily prevent area score increase
- `REVIEW`: Flag cluster for admin dashboard review
- `MONITOR`: Log pattern for analysis

**Repetitive Abuse Detection**:
- Same user, >5 reports, >80% identical = flagged
- All reports within 1 hour = flagged
- Pattern stored but user NOT blocked

**Response**:
- Down-weight all reports from pattern
- Require corroboration before score impact
- NEVER reveal flags publicly

**Code**: `/app/backend/confidence_engine.py` → `PatternAbuseDetector`

---

### Layer 6: Anonymous Reputation Weighting
**Purpose**: Internal behavior scoring (NEVER exposed publicly)

**Reputation Range**: 0.3 (minimum) to 1.5 (maximum)

**Factors**:
- **Corroboration rate**: % of reports later corroborated
  - >70% = +0.3 boost
  - <30% = -0.2 penalty
- **Report diversity**: Variety of categories
  - >60% unique = +0.1 boost
- **Spam flags**: Number of abuse detections
  - >5 flags = -0.4 penalty

**CRITICAL RULES**:
- ❌ Never shown to user
- ❌ Never used for blocking
- ❌ Never exposed in API
- ✅ Only affects report weight (0.3x to 1.5x)
- ✅ Stored internally in `user_reputation` collection

**Code**: `/app/backend/risk_scoring.py` → `AnonymousReputationSystem`

---

## 📊 AREA RISK SCORE CALCULATION

### Grid System
- **Grid size**: 200m × 200m (optimal for urban India)
- **Grid ID format**: `grid_<lat_bucket>_<lng_bucket>`
- **Example**: lat=28.6139, lng=77.2090 → `grid_28613_77209`

**Code**: `/app/backend/risk_scoring.py` → `AreaGridSystem.get_grid_id()`

### Risk Score Formula

```
Area Risk Score = Σ (severity × confidence × time_decay × reputation)
                  Normalized to 0-100 scale
```

**Step-by-Step**:
1. For each incident in grid:
   - `weighted_score = severity × confidence × time_decay × reputation`
2. Sum all weighted scores: `total = Σ weighted_score`
3. Normalize using logarithmic scaling:
   - `normalized = min(100, (log(1 + total) / log(1 + MAX_RAW_SCORE)) × 100)`
4. Assign color zone:
   - 0-30 = 🟢 GREEN (safe)
   - 31-60 = 🟡 YELLOW (moderate risk)
   - 61-100 = 🔴 RED (high risk)

**Why Logarithmic Scaling**:
- Prevents extreme scores from single spike
- Makes fake reports statistically irrelevant
- Score increases slower as incidents accumulate
- Matches human risk perception

**Example Calculation**:
```python
# Scenario: 10 reports in grid

Report 1: severity=4, confidence=0.8, decay=1.0, reputation=1.0
  → 4 × 0.8 × 1.0 × 1.0 = 3.2

Report 2: severity=5, confidence=0.9, decay=0.9, reputation=1.2
  → 5 × 0.9 × 0.9 × 1.2 = 4.86

Report 3 (fake): severity=5, confidence=0.2, decay=1.0, reputation=0.4
  → 5 × 0.2 × 1.0 × 0.4 = 0.4  # Minimal impact!

... (7 more reports)

Total weighted = 35.2
Normalized = (log(1 + 35.2) / log(1 + 100)) × 100 = 77.4

Risk Level = RED
```

**Code**: `/app/backend/risk_scoring.py` → `RiskScoringEngine.calculate_area_risk_score()`

---

## 🗺️ MAP & ALERT LOGIC

### Heatmap Display
- **Aggregated view only** (no exact pinpoints)
- Markers placed at grid center
- Opacity = weighted score
- Color = risk level (green/yellow/red)

### Time-of-Day Variation
- Track incidents by hour (0-23)
- Calculate separate risk scores for each hour
- Show "High risk after 8 PM" type warnings

### Geo-Fenced Alerts
- Silent notification when entering RED zone
- No sound, discreet message
- User can dismiss
- Alert threshold: Risk score > 70

**Implementation Status**:
- ✅ Basic heatmap implemented
- ⚠️ Time-of-day: To be added
- ⚠️ Geofencing: To be added

---

## 🛡️ HOW FAKE REPORTS BECOME IRRELEVANT

### Single Fake Report
```
Fake Report:
  severity = 5
  confidence = 0.2 (no corroboration, burst pattern)
  time_decay = 1.0
  reputation = 0.4 (spam history)
  
Weighted Score = 5 × 0.2 × 1.0 × 0.4 = 0.4

Impact on area with 20 legitimate reports (total score ~60):
  New total = 60.4
  % increase = 0.67%  # Negligible!
```

### Coordinated Attack (10 fake reports in burst)
```
Each Fake Report:
  weighted_score = 0.4 (same as above)
  
Pattern Detection:
  - >10 reports/hour detected
  - Area score FROZEN (no update)
  - All reports flagged for review
  - Confidence penalty applied: ×0.3
  
Actual Weighted Score per report = 0.4 × 0.3 = 0.12
Total impact = 10 × 0.12 = 1.2

Even if freeze lifted, 1.2 point increase on 60-point area = 2% increase
Risk Level: Still YELLOW (not RED)
```

### Legitimate Report Corroboration
```
Initial Report:
  confidence = 0.3 (first in area)
  weighted_score = 5 × 0.3 × 1.0 × 1.0 = 1.5
  
After 3 similar reports (from different users, over 2 days):
  confidence = 0.7 (corrobor

ated)
  weighted_score = 5 × 0.7 × 1.0 × 1.0 = 3.5
  
After 5+ similar reports:
  confidence = 0.95 (strong signal)
  weighted_score = 5 × 0.95 × 1.0 × 1.0 = 4.75
```

**Key Insight**: Legitimate reports compound, fake reports stay isolated

---

## ⚖️ LEGAL SAFETY (INDIA)

### Compliance Strategy
1. **No Content Verification**
   - We don't verify if reports are "true"
   - We aggregate statistical signals
   - Like weather forecasts, not crime reports

2. **No User Liability**
   - Anonymous reporting protects users
   - Can't be held liable for anonymous speech
   - Platform is information aggregator

3. **No Defamation Risk**
   - No names, addresses, or identifiable info
   - Grid-level aggregation (200m² area)
   - Statistical score, not accusation

4. **Safe Harbor Protection**
   - Platform is intermediary under IT Act 2000
   - Not publisher of user content
   - Take down on court order

5. **Privacy Compliant**
   - No personal data collected (IT Act 2000)
   - GDPR-style anonymity by design
   - Can't identify users even if ordered

### Terms of Service (Required)
```
"SafeSpace provides aggregated safety signals based on anonymous 
user reports. Reports are not verified and do not constitute 
accusations. Risk scores are statistical indicators, not factual 
statements. Users report at their own discretion."
```

---

## 📊 ADMIN DASHBOARD (INTERNAL ONLY)

### Dashboard Features
1. **Area Risk Trends**
   - Top 10 high-risk grids
   - Risk score changes over time
   - Category breakdown

2. **Spike Detection Alerts**
   - Grids under review
   - Frozen grids
   - Burst patterns detected

3. **Abuse Pattern Visualization**
   - Repetitive report patterns
   - Time clustering analysis
   - Category distribution anomalies

4. **System Health Metrics**
   - Total reports/day
   - Average confidence scores
   - Corroboration rates

### What Admin CANNOT See
- ❌ User identities
- ❌ Individual user reports (linked to hash)
- ❌ Seed phrases or any PII

### What Admin CAN See
- ✅ Aggregated grid statistics
- ✅ Pattern flags (anonymous)
- ✅ System-wide metrics
- ✅ Abuse detection alerts

**Code**: To be implemented in Phase 2

---

## 🗄️ DATABASE SCHEMA UPDATES

### incidents Collection (Enhanced)
```javascript
{
  incident_id: UUID,
  user_id: UUID | null,  // Removed after moderation
  location: GeoJSON,
  rounded_location: GeoJSON,
  grid_id: "grid_28613_77209",  // NEW
  category: string,
  severity: 1-5,
  description: string,
  
  // NEW FIELDS
  confidence_score: 0.0-1.0,
  reputation_weight: 0.3-1.5,
  time_decay_weight: 0.0-1.0,
  is_corroborated: boolean,
  corroboration_count: int,
  cluster_id: string | null,  // For burst detection
  
  moderation_status: string,
  timestamp: datetime,
  created_at: datetime
}
```

### area_grids Collection (NEW)
```javascript
{
  grid_id: "grid_28613_77209",
  center_location: GeoJSON,
  risk_score: 0-100,
  risk_level: "green"|"yellow"|"red",
  total_incidents: int,
  weighted_incidents: float,
  last_updated: datetime,
  
  // Category breakdown
  breakdown: {
    harassment: {count: 5, weighted_score: 12.3},
    stalking: {count: 2, weighted_score: 4.5},
    ...
  },
  
  // Hourly risk variation
  hourly_risk: {
    0: {count: 0, avg_severity: 0, risk_level: "unknown"},
    ...
    20: {count: 8, avg_severity: 4.2, risk_level: "high"},
    ...
  },
  
  // Spike detection
  is_frozen: boolean,
  freeze_reason: string | null,
  freeze_until: datetime | null
}
```

### user_reputation Collection (NEW, INTERNAL ONLY)
```javascript
{
  user_hash: string,  // Anonymous identifier
  reputation_weight: 0.3-1.5,
  total_reports: int,
  corroborated_reports: int,
  spam_flags: int,
  category_diversity: float,
  last_report: datetime,
  created_at: datetime,
  
  // NEVER INCLUDE
  // No user_id, no personal data, no identifiable info
}
```

### abuse_patterns Collection (NEW)
```javascript
{
  pattern_id: UUID,
  grid_id: string,
  pattern_type: "spike"|"repetitive"|"clustered",
  detection_time: datetime,
  incident_ids: [UUID],
  severity: "low"|"medium"|"high",
  action_taken: "monitor"|"review"|"freeze",
  resolved: boolean,
  resolution_time: datetime | null
}
```

---

## 🚀 IMPLEMENTATION PLAN

### ✅ Phase 1: COMPLETED
- [x] Confidence scoring engine
- [x] Time decay calculation
- [x] Pattern abuse detection
- [x] Area grid system
- [x] Risk scoring algorithm
- [x] Anonymous reputation system
- [x] Corroboration engine

### ⏳ Phase 2: IN PROGRESS
- [ ] Update database schema
- [ ] Integrate engines into server.py
- [ ] Update incident reporting API
- [ ] Recalculate existing incident scores
- [ ] Add admin dashboard endpoints

### 📅 Phase 3: PLANNED
- [ ] Enhanced frontend reporting (time window)
- [ ] Grid-based map display
- [ ] Time-of-day risk visualization
- [ ] Geofencing alerts
- [ ] Admin dashboard UI

---

## 📈 SUCCESS METRICS

### System Effectiveness
- Fake reports have <5% impact on area scores
- Legitimate reports reach 0.7+ confidence within 48h
- Area scores recover from spam within 7 days (time decay)

### Anti-Abuse Performance
- Spike detection: <2% false positives
- Pattern detection: >90% accuracy
- Coordinated attacks neutralized within 1 hour

### User Experience
- Report submission: <30 seconds
- Risk score calculation: <500ms
- Map load time: <2 seconds

---

## 🎓 KEY INSIGHTS

1. **Fake reports are inevitable** - system must handle them gracefully
2. **Statistical relevance > absolute truth** - aggregate signals, not facts
3. **Time is the great equalizer** - fake reports fade, patterns persist
4. **Anonymity enables honesty** - but requires statistical safeguards
5. **No single report matters** - only patterns create signal

**This system treats safety reporting like climate science: 
Individual data points are noisy, but statistical patterns reveal truth.**

---

**Status**: Engines implemented, integration in progress
**Production-Ready**: 80% complete
**Testing Required**: Full integration testing with simulated attacks
