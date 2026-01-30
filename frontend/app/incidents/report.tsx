import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const CATEGORIES = [
  { id: 'harassment', label: 'Harassment', icon: 'person' },
  { id: 'stalking', label: 'Stalking', icon: 'eye' },
  { id: 'unsafe_crowd', label: 'Unsafe Crowd', icon: 'people' },
  { id: 'eve_teasing', label: 'Eve Teasing', icon: 'chatbox-ellipses' },
  { id: 'suspicious_activity', label: 'Suspicious Activity', icon: 'warning' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export default function ReportIncident() {
  const router = useRouter();
  const { seedHash } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState(3);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(true);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to report incidents.');
        router.back();
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!category) {
      Alert.alert('Required', 'Please select an incident category');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Location not available. Please try again.');
      return;
    }

    if (!seedHash) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    setLoading(true);
    try {
      await api.reportIncident({
        seed_hash: seedHash,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        category,
        severity,
        description: description.trim() || undefined,
      });

      Alert.alert(
        'Report Submitted',
        'Thank you for reporting. Your report is under moderation and will be added to the map once verified.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  if (gettingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333EA" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Report Incident</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.anonymousNotice}>
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            <Text style={styles.anonymousText}>
              Your report is 100% anonymous. No personal data is stored.
            </Text>
          </View>

          {/* Category Selection */}
          <Text style={styles.sectionTitle}>What happened?</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryCard,
                  category === cat.id && styles.categoryCardSelected,
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={28}
                  color={category === cat.id ? '#9333EA' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.categoryText,
                    category === cat.id && styles.categoryTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Severity Slider */}
          <Text style={styles.sectionTitle}>How severe? (1-5)</Text>
          <View style={styles.severityContainer}>
            {[1, 2, 3, 4, 5].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.severityButton,
                  severity === level && styles.severityButtonSelected,
                  { backgroundColor: getSeverityColor(level) },
                ]}
                onPress={() => setSeverity(level)}
              >
                <Text
                  style={[
                    styles.severityText,
                    severity === level && styles.severityTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.severityLabel}>{getSeverityLabel(severity)}</Text>

          {/* Optional Description */}
          <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe what happened (optional)"
            placeholderTextColor="#6B7280"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/500</Text>

          {/* Location Display */}
          {location && (
            <View style={styles.locationCard}>
              <Ionicons name="location" size={20} color="#9333EA" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.locationTitle}>Report Location</Text>
                <Text style={styles.locationText}>
                  {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
                </Text>
                <Text style={styles.locationNote}>
                  (Rounded for privacy)
                </Text>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.privacyNotice}>
            <Ionicons name="information-circle" size={16} color="#6B7280" />
            <Text style={styles.privacyText}>
              After moderation, your report will be decoupled from your account for maximum privacy.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getSeverityColor = (level: number): string => {
  const colors = ['#10B981', '#FCD34D', '#F59E0B', '#F97316', '#DC2626'];
  return colors[level - 1];
};

const getSeverityLabel = (level: number): string => {
  const labels = ['Minor', 'Low', 'Moderate', 'Serious', 'Critical'];
  return labels[level - 1];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
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
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  anonymousNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  anonymousText: {
    flex: 1,
    color: '#6EE7B7',
    fontSize: 13,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    borderColor: '#9333EA',
    backgroundColor: '#2D1B4E',
  },
  categoryText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  severityButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  severityButtonSelected: {
    borderColor: '#FFFFFF',
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  severityTextSelected: {
    fontSize: 20,
  },
  severityLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  textArea: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#374151',
  },
  charCount: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 24,
  },
  locationCard: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  locationTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  locationNote: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  privacyText: {
    flex: 1,
    color: '#6B7280',
    fontSize: 12,
    marginLeft: 8,
    lineHeight: 16,
  },
});
