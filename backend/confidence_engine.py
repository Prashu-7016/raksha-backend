"""
CONFIDENCE SCORING ENGINE
Multi-layer fake report detection system
"""
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from collections import Counter


class ConfidenceEngine:
    """
    Calculates confidence scores for incident reports
    Range: 0.0 (likely fake) to 1.0 (highly confident)
    """
    
    # Confidence weights
    WEIGHTS = {
        'corroboration': 0.35,      # Similar reports in area
        'historical_pattern': 0.25,  # Matches known patterns
        'temporal_spread': 0.20,     # Reports over time, not burst
        'category_diversity': 0.10,  # Different categories reported
        'severity_consistency': 0.10  # Severity aligns with area history
    }
    
    # Thresholds
    CORROBORATION_THRESHOLDS = {
        'noise': 1,        # Single report = noise
        'weak_signal': 3,  # 3 reports = weak signal
        'strong_signal': 5 # 5+ reports = strong signal
    }
    
    SPIKE_DETECTION = {
        'max_per_hour': 5,      # More than 5 reports/hour = suspicious
        'max_per_grid_day': 20  # More than 20 reports/grid/day = review
    }
    
    @staticmethod
    def calculate_confidence(
        incident: Dict,
        similar_incidents: List[Dict],
        area_history: List[Dict],
        recent_burst: int
    ) -> float:
        """
        Main confidence calculation
        
        Args:
            incident: Current incident report
            similar_incidents: Reports in same grid (200m radius)
            area_history: Historical reports in area
            recent_burst: Number of reports in last hour
            
        Returns:
            Confidence score (0.0 - 1.0)
        """
        scores = {}
        
        # Layer 1: Corroboration Score
        scores['corroboration'] = ConfidenceEngine._corroboration_score(
            similar_incidents
        )
        
        # Layer 2: Historical Pattern Score
        scores['historical_pattern'] = ConfidenceEngine._historical_pattern_score(
            incident, area_history
        )
        
        # Layer 3: Temporal Spread Score
        scores['temporal_spread'] = ConfidenceEngine._temporal_spread_score(
            similar_incidents, recent_burst
        )
        
        # Layer 4: Category Diversity Score
        scores['category_diversity'] = ConfidenceEngine._category_diversity_score(
            similar_incidents
        )
        
        # Layer 5: Severity Consistency Score
        scores['severity_consistency'] = ConfidenceEngine._severity_consistency_score(
            incident, area_history
        )
        
        # Weighted average
        confidence = sum(
            scores[key] * ConfidenceEngine.WEIGHTS[key]
            for key in scores
        )
        
        # Apply penalties for suspicious patterns
        confidence = ConfidenceEngine._apply_penalties(
            confidence, recent_burst, similar_incidents
        )
        
        return max(0.0, min(1.0, confidence))
    
    @staticmethod
    def _corroboration_score(similar_incidents: List[Dict]) -> float:
        """
        Score based on number of similar reports
        1 report = 0.2 (noise)
        3 reports = 0.5 (weak signal)
        5+ reports = 0.9 (strong signal)
        """
        count = len(similar_incidents)
        
        if count <= 1:
            return 0.2  # First report in area = low confidence
        elif count <= 2:
            return 0.4  # Two reports = slight corroboration
        elif count <= 4:
            return 0.6  # Weak signal
        elif count <= 7:
            return 0.8  # Strong signal
        else:
            return 0.95  # Very strong signal
    
    @staticmethod
    def _historical_pattern_score(
        incident: Dict,
        area_history: List[Dict]
    ) -> float:
        """
        Check if report matches historical patterns in area
        """
        if not area_history:
            return 0.3  # No history = lower confidence
        
        # Check category frequency
        categories = [h['category'] for h in area_history]
        category_counts = Counter(categories)
        
        current_category = incident['category']
        category_frequency = category_counts.get(current_category, 0) / len(area_history)
        
        # Check severity alignment
        severities = [h['severity'] for h in area_history]
        avg_severity = sum(severities) / len(severities) if severities else 3
        severity_diff = abs(incident['severity'] - avg_severity)
        
        # Score calculation
        pattern_score = 0.5  # Base score
        
        # Boost if category is common in area
        if category_frequency > 0.2:
            pattern_score += 0.3
        elif category_frequency > 0.1:
            pattern_score += 0.15
        
        # Penalize if severity is way off
        if severity_diff > 2:
            pattern_score -= 0.2
        
        return max(0.0, min(1.0, pattern_score))
    
    @staticmethod
    def _temporal_spread_score(
        similar_incidents: List[Dict],
        recent_burst: int
    ) -> float:
        """
        Check if reports are spread over time or burst
        Burst = suspicious, spread = legitimate
        """
        if not similar_incidents:
            return 0.5  # Neutral for first report
        
        # Check for burst pattern
        if recent_burst >= ConfidenceEngine.SPIKE_DETECTION['max_per_hour']:
            return 0.1  # Suspicious burst
        
        # Calculate time spread
        timestamps = [inc['timestamp'] for inc in similar_incidents]
        if len(timestamps) < 2:
            return 0.5
        
        timestamps.sort()
        time_span = (timestamps[-1] - timestamps[0]).total_seconds() / 3600  # hours
        
        # Good spread: reports over days, not hours
        if time_span > 48:  # 2+ days
            return 0.95
        elif time_span > 24:  # 1+ day
            return 0.8
        elif time_span > 12:  # 12+ hours
            return 0.6
        elif time_span > 4:  # 4+ hours
            return 0.4
        else:  # < 4 hours = suspicious
            return 0.2
    
    @staticmethod
    def _category_diversity_score(similar_incidents: List[Dict]) -> float:
        """
        Check if area has diverse incident types (realistic)
        vs. all same category (suspicious)
        """
        if not similar_incidents:
            return 0.5
        
        categories = [inc['category'] for inc in similar_incidents]
        unique_categories = len(set(categories))
        total_reports = len(categories)
        
        diversity_ratio = unique_categories / total_reports
        
        # High diversity = more realistic
        if diversity_ratio > 0.6:
            return 0.9
        elif diversity_ratio > 0.4:
            return 0.7
        elif diversity_ratio > 0.2:
            return 0.5
        else:
            return 0.3  # All same category = suspicious
    
    @staticmethod
    def _severity_consistency_score(
        incident: Dict,
        area_history: List[Dict]
    ) -> float:
        """
        Check if severity is consistent with area patterns
        """
        if not area_history:
            return 0.5
        
        severities = [h['severity'] for h in area_history]
        avg_severity = sum(severities) / len(severities)
        std_dev = (
            sum((s - avg_severity) ** 2 for s in severities) / len(severities)
        ) ** 0.5
        
        current_severity = incident['severity']
        deviation = abs(current_severity - avg_severity)
        
        # Within 1 std dev = good
        if std_dev == 0:
            std_dev = 1  # Avoid division by zero
        
        z_score = deviation / std_dev
        
        if z_score < 1:
            return 0.9
        elif z_score < 2:
            return 0.6
        else:
            return 0.3  # Outlier severity
    
    @staticmethod
    def _apply_penalties(
        base_confidence: float,
        recent_burst: int,
        similar_incidents: List[Dict]
    ) -> float:
        """
        Apply penalties for suspicious patterns
        """
        confidence = base_confidence
        
        # Penalty for burst reporting
        if recent_burst >= 10:
            confidence *= 0.3  # Severe penalty
        elif recent_burst >= 5:
            confidence *= 0.6  # Moderate penalty
        
        # Penalty for identical repetition
        if similar_incidents:
            # Check for exact duplicates (same category + severity)
            patterns = [(inc['category'], inc['severity']) for inc in similar_incidents]
            pattern_counts = Counter(patterns)
            max_repetition = max(pattern_counts.values())
            
            if max_repetition > 5:
                confidence *= 0.5  # Too many identical reports
        
        return confidence


class TimeDecayEngine:
    """
    Handles time-based decay of report influence
    """
    
    @staticmethod
    def calculate_decay_weight(
        timestamp: datetime,
        decay_days: int = 30
    ) -> float:
        """
        Exponential decay: weight = e^(-days_since / decay_days)
        
        30 days = 0.368 weight
        60 days = 0.135 weight
        90 days = 0.050 weight
        """
        days_since = (datetime.utcnow() - timestamp).days
        weight = math.exp(-days_since / decay_days)
        return weight
    
    @staticmethod
    def calculate_combined_weight(
        confidence_score: float,
        timestamp: datetime,
        reputation_weight: float = 1.0
    ) -> float:
        """
        Combined weight = confidence × time_decay × reputation
        """
        time_decay = TimeDecayEngine.calculate_decay_weight(timestamp)
        return confidence_score * time_decay * reputation_weight


class PatternAbuseDetector:
    """
    Detects coordinated abuse patterns
    """
    
    @staticmethod
    def detect_spike(
        incidents_last_hour: int,
        incidents_last_day: int,
        grid_id: str
    ) -> Dict[str, any]:
        """
        Detect sudden spikes in reporting
        
        Returns:
            {
                'is_spike': bool,
                'severity': 'low'|'medium'|'high',
                'action': 'monitor'|'freeze'|'review'
            }
        """
        result = {
            'is_spike': False,
            'severity': 'none',
            'action': 'none',
            'grid_id': grid_id
        }
        
        # High-severity spike
        if incidents_last_hour > 10:
            result['is_spike'] = True
            result['severity'] = 'high'
            result['action'] = 'freeze'  # Freeze area score updates
        
        # Medium-severity spike
        elif incidents_last_hour > 5:
            result['is_spike'] = True
            result['severity'] = 'medium'
            result['action'] = 'review'  # Flag for review
        
        # Daily volume check
        elif incidents_last_day > 30:
            result['is_spike'] = True
            result['severity'] = 'medium'
            result['action'] = 'monitor'
        
        return result
    
    @staticmethod
    def detect_repetitive_abuse(
        user_hash: str,
        recent_reports: List[Dict],
        time_window_hours: int = 24
    ) -> Dict[str, any]:
        """
        Detect if single user is spamming reports
        """
        if len(recent_reports) < 3:
            return {'is_abuse': False}
        
        # Check for identical patterns
        patterns = [
            (r['category'], r['severity'])
            for r in recent_reports
        ]
        
        # If >80% are identical, likely abuse
        pattern_counts = Counter(patterns)
        most_common_count = pattern_counts.most_common(1)[0][1]
        repetition_rate = most_common_count / len(recent_reports)
        
        if repetition_rate > 0.8 and len(recent_reports) > 5:
            return {
                'is_abuse': True,
                'confidence': 0.9,
                'pattern': 'repetitive_identical'
            }
        
        # Check time clustering
        timestamps = [r['timestamp'] for r in recent_reports]
        timestamps.sort()
        
        # All reports within 1 hour = suspicious
        if len(timestamps) > 1:
            time_span = (timestamps[-1] - timestamps[0]).total_seconds() / 3600
            if time_span < 1 and len(recent_reports) > 3:
                return {
                    'is_abuse': True,
                    'confidence': 0.85,
                    'pattern': 'time_clustered'
                }
        
        return {'is_abuse': False}
