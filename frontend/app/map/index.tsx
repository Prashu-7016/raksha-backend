import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

export default function MapScreen() {
  const router = useRouter();
  const { seedHash, logout } = useAuth();
  
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [riskScore, setRiskScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [nearbyIncidents, setNearbyIncidents] = useState<number>(0);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'SafeSpace needs location access to show safety information.',
          [
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        setLoading(false);
        return;
      }

      console.log('Getting current location...');
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      console.log('Location obtained:', loc.coords);
      setLocation(loc);

      await loadSafetyData(loc.coords.latitude, loc.coords.longitude);
    } catch (error: any) {
      console.error('Location error:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your location. Please enable location services and try again.',
        [
          {
            text: 'Retry',
            onPress: () => {
              setLoading(true);
              requestLocationPermission();
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const loadSafetyData = async (lat: number, lng: number) => {
    try {
      const risk = await api.getRiskScore(lat, lng, 1.0);
      setRiskScore(risk);
      setNearbyIncidents(risk.incident_count || 0);
    } catch (error) {
      console.error('Error loading safety data:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/welcome');
        },
      },
    ]);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return '#DC2626';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#FCD34D';
      default:
        return '#10B981';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333EA" />
        <Text style={styles.loadingText}>Loading your safety information...</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="location-outline" size={64} color="#6B7280" />
        <Text style={styles.errorText}>Location not available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestLocationPermission}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.appTitle}>
            <Ionicons name="shield-checkmark" size={32} color="#9333EA" />
            <Text style={styles.appTitleText}>SafeSpace</Text>
          </View>
          
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowMenu(!showMenu)}
          >
            <Ionicons name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Menu Overlay */}
        {showMenu && (
          <View style={styles.menuOverlay}>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              <Text style={styles.menuItemText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Location Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={24} color="#9333EA" />
            <Text style={styles.cardTitle}>Your Location</Text>
          </View>
          <Text style={styles.locationText}>
            {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
          </Text>
          <Text style={styles.locationNote}>
            Location rounded for privacy
          </Text>
        </View>

        {/* Risk Score Card */}
        {riskScore && (
          <View style={[styles.card, styles.riskCard]}>
            <View style={styles.cardHeader}>
              <Ionicons
                name="alert-circle"
                size={24}
                color={getRiskColor(riskScore.risk_level)}
              />
              <Text style={styles.cardTitle}>Area Safety Score</Text>
            </View>
            
            <View style={styles.riskScoreContainer}>
              <Text
                style={[
                  styles.riskLevel,
                  { color: getRiskColor(riskScore.risk_level) },
                ]}
              >
                {riskScore.risk_level.toUpperCase()}
              </Text>
              <Text style={styles.riskScore}>
                {Math.round(riskScore.risk_score)}/100
              </Text>
            </View>
            
            <Text style={styles.riskDetail}>
              {nearbyIncidents} incidents reported within 1km
            </Text>

            {/* Category Breakdown */}
            {riskScore.categories && Object.keys(riskScore.categories).length > 0 && (
              <View style={styles.categoriesContainer}>
                <Text style={styles.categoriesTitle}>Incident Types:</Text>
                {Object.entries(riskScore.categories).map(([category, count]: any) => (
                  <View key={category} style={styles.categoryRow}>
                    <Text style={styles.categoryName}>{category.replace('_', ' ')}</Text>
                    <Text style={styles.categoryCount}>{count}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Safety Tips */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bulb" size={24} color="#F59E0B" />
            <Text style={styles.cardTitle}>Safety Tips</Text>
          </View>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>• Share your location with trusted contacts</Text>
            <Text style={styles.tipItem}>• Avoid isolated areas, especially after dark</Text>
            <Text style={styles.tipItem}>• Trust your instincts</Text>
            <Text style={styles.tipItem}>• Keep emergency numbers handy</Text>
          </View>
        </View>

        {/* Map Note */}
        <View style={styles.noteCard}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.noteText}>
            📍 Interactive map with heatmaps will be available in the production app build
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={async () => {
              setLoading(true);
              await requestLocationPermission();
            }}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.refreshButtonText}>Refresh Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => router.push('/incidents/report')}
          >
            <Ionicons name="alert" size={24} color="#FFFFFF" />
            <Text style={styles.reportButtonText}>Report Incident</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#9CA3AF',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#9333EA',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  appTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appTitleText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  menuItemText: {
    color: '#DC2626',
    fontSize: 16,
    marginLeft: 12,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  riskCard: {
    borderWidth: 2,
    borderColor: '#374151',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  locationText: {
    color: '#D1D5DB',
    fontSize: 16,
    marginBottom: 4,
  },
  locationNote: {
    color: '#6B7280',
    fontSize: 12,
    fontStyle: 'italic',
  },
  riskScoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  riskLevel: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  riskScore: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  riskDetail: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 16,
  },
  categoriesContainer: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
  },
  categoriesTitle: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  categoryName: {
    color: '#9CA3AF',
    fontSize: 13,
    textTransform: 'capitalize',
  },
  categoryCount: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  tipsList: {
    marginTop: 8,
  },
  tipItem: {
    color: '#D1D5DB',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  noteText: {
    flex: 1,
    color: '#93C5FD',
    fontSize: 13,
    marginLeft: 12,
    lineHeight: 18,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reportButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
