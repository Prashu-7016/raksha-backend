import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

// Conditionally import MapView only on native platforms
let MapView: any;
let Circle: any;
let Marker: any;
let PROVIDER_DEFAULT: any;

if (Platform.OS !== 'web') {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Circle = RNMaps.Circle;
  Marker = RNMaps.Marker;
  PROVIDER_DEFAULT = RNMaps.PROVIDER_DEFAULT;
}

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const router = useRouter();
  const { seedHash, logout } = useAuth();
  const mapRef = useRef<MapView>(null);
  
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [dangerZones, setDangerZones] = useState<any[]>([]);
  const [riskScore, setRiskScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required to use this app and report incidents.'
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      
      // Center map on user location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }

      await loadMapData(loc.coords.latitude, loc.coords.longitude);
    } catch (error) {
      console.error('Location permission error:', error);
      Alert.alert('Error', 'Failed to get location permission');
    } finally {
      setLoading(false);
    }
  };

  const loadMapData = async (lat: number, lng: number) => {
    try {
      // Get heatmap data for visible area
      const bounds = {
        min_lat: lat - 0.05,
        max_lat: lat + 0.05,
        min_lng: lng - 0.05,
        max_lng: lng + 0.05,
      };

      const [heatmap, zones, risk] = await Promise.all([
        api.getHeatmapData(bounds),
        api.getDangerZones(bounds),
        api.getRiskScore(lat, lng, 1.0),
      ]);

      setHeatmapData(heatmap.points || []);
      setDangerZones(zones.zones || []);
      setRiskScore(risk);
    } catch (error) {
      console.error('Error loading map data:', error);
    }
  };

  const refreshLocation = async () => {
    if (!location) return;
    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      await loadMapData(loc.coords.latitude, loc.coords.longitude);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setLoading(false);
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
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="location-outline" size={64} color="#6B7280" />
        <Text style={styles.errorText}>Location not available</Text>
      </View>
    );
  }

  // Web fallback UI
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webFallbackContainer}>
          <View style={styles.webHeader}>
            <Ionicons name="shield-checkmark" size={80} color="#9333EA" />
            <Text style={styles.webTitle}>SafeSpace</Text>
            <Text style={styles.webSubtitle}>Women's Safety App</Text>
          </View>

          <View style={styles.webWarning}>
            <Ionicons name="phone-portrait" size={48} color="#F59E0B" />
            <Text style={styles.webWarningTitle}>Mobile App Required</Text>
            <Text style={styles.webWarningText}>
              SafeSpace uses native GPS and mapping features that only work on mobile devices.
            </Text>
          </View>

          <View style={styles.webInstructions}>
            <Text style={styles.webInstructionsTitle}>How to Test:</Text>
            <View style={styles.webStep}>
              <Text style={styles.webStepNumber}>1.</Text>
              <Text style={styles.webStepText}>Install Expo Go on your phone (Android/iOS)</Text>
            </View>
            <View style={styles.webStep}>
              <Text style={styles.webStepNumber}>2.</Text>
              <Text style={styles.webStepText}>Scan the QR code from Expo preview</Text>
            </View>
            <View style={styles.webStep}>
              <Text style={styles.webStepNumber}>3.</Text>
              <Text style={styles.webStepText}>Experience full map, GPS, and safety features</Text>
            </View>
          </View>

          <View style={styles.webFeatures}>
            <Text style={styles.webFeaturesTitle}>Features on Mobile:</Text>
            <View style={styles.webFeature}>
              <Ionicons name="map" size={20} color="#10B981" />
              <Text style={styles.webFeatureText}>Live map with heatmaps</Text>
            </View>
            <View style={styles.webFeature}>
              <Ionicons name="location" size={20} color="#10B981" />
              <Text style={styles.webFeatureText}>GPS incident reporting</Text>
            </View>
            <View style={styles.webFeature}>
              <Ionicons name="alert-circle" size={20} color="#10B981" />
              <Text style={styles.webFeatureText}>Real-time danger zones</Text>
            </View>
            <View style={styles.webFeature}>
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              <Text style={styles.webFeatureText}>100% anonymous reporting</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.webLogoutButton}
            onPress={async () => {
              await logout();
              router.replace('/auth/welcome');
            }}
          >
            <Text style={styles.webLogoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Danger Zones */}
        {dangerZones.map((zone) => (
          <Circle
            key={zone.zone_id}
            center={{
              latitude: zone.center.latitude,
              longitude: zone.center.longitude,
            }}
            radius={zone.radius}
            fillColor={`${getRiskColor(zone.risk_level)}33`}
            strokeColor={getRiskColor(zone.risk_level)}
            strokeWidth={2}
          />
        ))}

        {/* Heatmap Points as Markers */}
        {heatmapData.map((point, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: point.latitude,
              longitude: point.longitude,
            }}
            opacity={point.weight}
          >
            <View
              style={[
                styles.heatmapMarker,
                { backgroundColor: point.severity > 3 ? '#DC2626' : '#F59E0B' },
              ]}
            />
          </Marker>
        ))}
      </MapView>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.appTitle}>
          <Ionicons name="shield-checkmark" size={24} color="#9333EA" />
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

      {/* Risk Score Card */}
      {riskScore && (
        <View style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <Ionicons
              name="alert-circle"
              size={20}
              color={getRiskColor(riskScore.risk_level)}
            />
            <Text style={styles.riskTitle}>Current Area Risk</Text>
          </View>
          <Text
            style={[
              styles.riskLevel,
              { color: getRiskColor(riskScore.risk_level) },
            ]}
          >
            {riskScore.risk_level.toUpperCase()}
          </Text>
          <Text style={styles.riskDetail}>
            {riskScore.incident_count} incidents reported nearby
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshLocation}>
          <Ionicons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => router.push('/incidents/report')}
        >
          <Ionicons name="alert" size={28} color="#FFFFFF" />
          <Text style={styles.reportButtonText}>Report Incident</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => {
            if (mapRef.current && location) {
              mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              });
            }
          }}
        >
          <Ionicons name="locate" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Risk Levels</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Safe</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FCD34D' }]} />
            <Text style={styles.legendText}>Low</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Medium</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.legendText}>High</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  map: {
    width: width,
    height: height,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 16,
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  appTitleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  menuButton: {
    backgroundColor: '#1F2937',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 8,
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
  riskCard: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskTitle: {
    color: '#D1D5DB',
    fontSize: 14,
    marginLeft: 8,
  },
  riskLevel: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  riskDetail: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    backgroundColor: '#1F2937',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationButton: {
    backgroundColor: '#1F2937',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    backgroundColor: '#1F2937',
    padding: 12,
    borderRadius: 12,
  },
  legendTitle: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  heatmapMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  // Web fallback styles
  webFallbackContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  webTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  webSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
  },
  webWarning: {
    backgroundColor: '#451A03',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#F59E0B',
    maxWidth: 500,
  },
  webWarningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FCD34D',
    marginTop: 16,
    marginBottom: 8,
  },
  webWarningText: {
    fontSize: 14,
    color: '#FCD34D',
    textAlign: 'center',
    lineHeight: 20,
  },
  webInstructions: {
    backgroundColor: '#1F2937',
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
    maxWidth: 500,
    width: '100%',
  },
  webInstructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  webStep: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  webStepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9333EA',
    marginRight: 8,
    width: 24,
  },
  webStepText: {
    flex: 1,
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  webFeatures: {
    backgroundColor: '#1F2937',
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
    maxWidth: 500,
    width: '100%',
  },
  webFeaturesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  webFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  webFeatureText: {
    fontSize: 14,
    color: '#D1D5DB',
    marginLeft: 12,
  },
  webLogoutButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  webLogoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});