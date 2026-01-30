"""
AREA GRID SYSTEM & RISK SCORING
Grid-based safety scoring with abuse resistance
"""
import math
from typing import Dict, List, Tuple
from datetime import datetime


class AreaGridSystem:
    """
    Manages 200m x 200m grid system for area risk scoring
    """
    
    GRID_SIZE_METERS = 200  # 200m x 200m grid cells
    EARTH_RADIUS_KM = 6371
    
    @staticmethod
    def get_grid_id(latitude: float, longitude: float) -> str:
        """
        Convert lat/lng to grid ID
        
        Grid system:
        - Each cell is ~200m x 200m
        - Grid ID format: "grid_<lat_bucket>_<lng_bucket>"
        
        Example: lat=28.6139, lng=77.2090
        -> grid_28613_77209
        """
        # Convert to grid coordinates (multiply by 1000, then divide by 2)
        lat_bucket = int(latitude * 1000 / 2)
        lng_bucket = int(longitude * 1000 / 2)
        
        return f"grid_{lat_bucket}_{lng_bucket}"
    
    @staticmethod
    def get_grid_center(grid_id: str) -> Tuple[float, float]:
        """
        Get center coordinates of a grid cell
        """
        parts = grid_id.split('_')
        lat_bucket = int(parts[1])
        lng_bucket = int(parts[2])
        
        # Convert back to lat/lng
        latitude = (lat_bucket * 2) / 1000
        longitude = (lng_bucket * 2) / 1000
        
        return (latitude, longitude)
    
    @staticmethod
    def get_neighboring_grids(grid_id: str, radius: int = 1) -> List[str]:
        """
        Get neighboring grid IDs
        
        Args:
            grid_id: Current grid
            radius: Number of grid cells to expand (1 = 8 neighbors)
        
        Returns:
            List of grid IDs including neighbors
        """
        parts = grid_id.split('_')
        lat_bucket = int(parts[1])
        lng_bucket = int(parts[2])
        
        neighbors = []
        for lat_offset in range(-radius, radius + 1):
            for lng_offset in range(-radius, radius + 1):
                neighbor_lat = lat_bucket + lat_offset
                neighbor_lng = lng_bucket + lng_offset
                neighbors.append(f"grid_{neighbor_lat}_{neighbor_lng}")
        
        return neighbors


class RiskScoringEngine:
    """
    Calculates area risk scores with multi-layer protection
    """
    
    # Risk thresholds
    RISK_LEVELS = {
        'green': (0, 30),
        'yellow': (31, 60),
        'red': (61, 100)
    }
    
    # Normalization constants
    MAX_RAW_SCORE = 100  # Expected maximum raw score for normalization
    
    @staticmethod
    def calculate_area_risk_score(
        incidents: List[Dict],
        confidence_engine,
        time_decay_engine
    ) -> Dict[str, any]:
        """
        Calculate aggregated risk score for an area
        
        Formula:
        Area Risk = Σ(severity × confidence × time_decay × reputation)
        Normalized to 0-100 scale
        
        Args:
            incidents: List of incident dicts with all fields
            confidence_engine: ConfidenceEngine instance
            time_decay_engine: TimeDecayEngine instance
            
        Returns:
            {
                'risk_score': float (0-100),
                'risk_level': 'green'|'yellow'|'red',
                'total_incidents': int,
                'weighted_incidents': float,
                'breakdown': {...}
            }
        """
        if not incidents:
            return {
                'risk_score': 0.0,
                'risk_level': 'green',
                'total_incidents': 0,
                'weighted_incidents': 0.0,
                'breakdown': {}
            }
        
        # Calculate weighted score for each incident
        weighted_scores = []
        category_breakdown = {}
        
        for incident in incidents:
            # Get all weight components
            confidence = incident.get('confidence_score', 0.5)
            severity = incident.get('severity', 3)
            timestamp = incident.get('timestamp', datetime.utcnow())
            reputation = incident.get('reputation_weight', 1.0)
            
            # Calculate time decay
            time_decay = time_decay_engine.calculate_decay_weight(timestamp)
            
            # Combined weight
            weight = confidence * time_decay * reputation
            
            # Weighted score = severity × weight
            weighted_score = severity * weight
            weighted_scores.append(weighted_score)
            
            # Track by category
            category = incident.get('category', 'other')
            if category not in category_breakdown:
                category_breakdown[category] = {
                    'count': 0,
                    'weighted_score': 0.0
                }
            category_breakdown[category]['count'] += 1
            category_breakdown[category]['weighted_score'] += weighted_score
        
        # Sum all weighted scores
        total_weighted_score = sum(weighted_scores)
        
        # Normalize to 0-100 scale
        # Use logarithmic scaling to prevent extreme scores
        if total_weighted_score > 0:
            normalized_score = min(100, (math.log1p(total_weighted_score) / math.log1p(RiskScoringEngine.MAX_RAW_SCORE)) * 100)
        else:
            normalized_score = 0.0
        
        # Determine risk level
        risk_level = RiskScoringEngine._get_risk_level(normalized_score)
        
        return {
            'risk_score': round(normalized_score, 2),
            'risk_level': risk_level,
            'total_incidents': len(incidents),
            'weighted_incidents': round(total_weighted_score, 2),
            'breakdown': category_breakdown,
            'calculation_timestamp': datetime.utcnow()
        }
    
    @staticmethod
    def _get_risk_level(score: float) -> str:
        """Determine risk level from score"""
        if score <= RiskScoringEngine.RISK_LEVELS['green'][1]:
            return 'green'
        elif score <= RiskScoringEngine.RISK_LEVELS['yellow'][1]:
            return 'yellow'
        else:
            return 'red'
    
    @staticmethod
    def calculate_time_of_day_risk(
        incidents: List[Dict],
        time_of_day: int  # 0-23 hour
    ) -> Dict[str, any]:
        """
        Calculate risk variation by time of day
        
        Args:
            incidents: All incidents in area
            time_of_day: Hour of day (0-23)
            
        Returns:
            Risk scores for each hour band
        """
        # Group incidents by hour
        hourly_incidents = {hour: [] for hour in range(24)}
        
        for incident in incidents:
            timestamp = incident.get('timestamp', datetime.utcnow())
            hour = timestamp.hour
            hourly_incidents[hour].append(incident)
        
        # Calculate risk for each hour
        hourly_risks = {}
        for hour in range(24):
            hour_incidents = hourly_incidents[hour]
            if hour_incidents:
                # Simplified score for hourly breakdown
                avg_severity = sum(inc.get('severity', 3) for inc in hour_incidents) / len(hour_incidents)
                hourly_risks[hour] = {
                    'incident_count': len(hour_incidents),
                    'avg_severity': round(avg_severity, 1),
                    'risk_level': 'high' if avg_severity >= 4 else 'medium' if avg_severity >= 2.5 else 'low'
                }
            else:
                hourly_risks[hour] = {
                    'incident_count': 0,
                    'avg_severity': 0,
                    'risk_level': 'unknown'
                }
        
        return hourly_risks


class AnonymousReputationSystem:
    """
    Internal reputation tracking (NEVER exposed publicly)
    """
    
    # Reputation bounds
    MIN_REPUTATION = 0.3   # Minimum weight for any report
    MAX_REPUTATION = 1.5   # Maximum weight boost
    NEUTRAL_REPUTATION = 1.0
    
    @staticmethod
    def calculate_user_reputation(
        user_hash: str,
        user_reports: List[Dict],
        corroboration_data: Dict
    ) -> float:
        """
        Calculate internal reputation weight for anonymous user
        
        CRITICAL: This is NEVER shown to user or used for blocking
        Only used to weight report influence
        
        Args:
            user_hash: Anonymous user identifier
            user_reports: All reports from this user
            corroboration_data: {
                'corroborated_count': int,
                'total_reports': int,
                'spam_flags': int
            }
            
        Returns:
            Reputation weight (0.3 - 1.5)
        """
        if not user_reports:
            return AnonymousReputationSystem.NEUTRAL_REPUTATION
        
        # Factor 1: Corroboration rate
        corroboration_rate = corroboration_data.get('corroborated_count', 0) / max(1, corroboration_data.get('total_reports', 1))
        
        # Factor 2: Spam flags
        spam_flags = corroboration_data.get('spam_flags', 0)
        
        # Factor 3: Report diversity
        categories = [r.get('category') for r in user_reports]
        unique_categories = len(set(categories))
        diversity_score = unique_categories / max(1, len(categories))
        
        # Calculate reputation
        reputation = AnonymousReputationSystem.NEUTRAL_REPUTATION
        
        # Boost for high corroboration
        if corroboration_rate > 0.7:
            reputation += 0.3
        elif corroboration_rate > 0.5:
            reputation += 0.15
        
        # Boost for diversity
        if diversity_score > 0.6:
            reputation += 0.1
        
        # Penalty for spam flags
        if spam_flags > 5:
            reputation -= 0.4
        elif spam_flags > 2:
            reputation -= 0.2
        
        # Clamp to bounds
        reputation = max(
            AnonymousReputationSystem.MIN_REPUTATION,
            min(AnonymousReputationSystem.MAX_REPUTATION, reputation)
        )
        
        return reputation
    
    @staticmethod
    def should_update_reputation(
        incident: Dict,
        corroboration_status: str
    ) -> Dict[str, any]:
        """
        Determine if/how to update reputation after incident
        
        Args:
            incident: Incident report
            corroboration_status: 'corroborated'|'disputed'|'pending'
            
        Returns:
            {
                'update_reputation': bool,
                'adjustment': float,
                'reason': str
            }
        """
        if corroboration_status == 'corroborated':
            return {
                'update_reputation': True,
                'adjustment': +0.05,
                'reason': 'report_corroborated'
            }
        elif corroboration_status == 'disputed':
            return {
                'update_reputation': True,
                'adjustment': -0.1,
                'reason': 'report_disputed'
            }
        else:
            return {
                'update_reputation': False,
                'adjustment': 0.0,
                'reason': 'pending_corroboration'
            }


class CorroborationEngine:
    """
    Detects when multiple reports corroborate each other
    """
    
    CORROBORATION_CRITERIA = {
        'time_window_hours': 72,      # 3 days
        'distance_meters': 300,        # Within 300m
        'min_reports': 3,              # At least 3 reports
        'category_match': True,        # Must be same category
        'different_users': True        # Must be from different anonymous hashes
    }
    
    @staticmethod
    def check_corroboration(
        incident: Dict,
        nearby_incidents: List[Dict]
    ) -> Dict[str, any]:
        """
        Check if incident is corroborated by others
        
        Returns:
            {
                'is_corroborated': bool,
                'corroboration_count': int,
                'corroborating_incidents': List[str],  # incident_ids
                'confidence_boost': float
            }
        """
        if not nearby_incidents:
            return {
                'is_corroborated': False,
                'corroboration_count': 0,
                'corroborating_incidents': [],
                'confidence_boost': 0.0
            }
        
        # Filter for matching incidents
        matching = []
        for other in nearby_incidents:
            # Same category
            if other.get('category') != incident.get('category'):
                continue
            
            # Different user
            if other.get('user_id') == incident.get('user_id'):
                continue
            
            # Within time window
            time_diff = abs((other.get('timestamp') - incident.get('timestamp')).total_seconds() / 3600)
            if time_diff > CorroborationEngine.CORROBORATION_CRITERIA['time_window_hours']:
                continue
            
            matching.append(other)
        
        corroboration_count = len(matching)
        is_corroborated = corroboration_count >= CorroborationEngine.CORROBORATION_CRITERIA['min_reports'] - 1
        
        # Calculate confidence boost
        confidence_boost = 0.0
        if corroboration_count >= 5:
            confidence_boost = 0.3
        elif corroboration_count >= 3:
            confidence_boost = 0.2
        elif corroboration_count >= 2:
            confidence_boost = 0.1
        
        return {
            'is_corroborated': is_corroborated,
            'corroboration_count': corroboration_count,
            'corroborating_incidents': [inc.get('incident_id') for inc in matching],
            'confidence_boost': confidence_boost
        }
