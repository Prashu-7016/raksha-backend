import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { validateSeedPhrase } from '../../utils/seedPhrase';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [seedPhrase, setSeedPhrase] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!seedPhrase.trim()) {
      Alert.alert('Error', 'Please enter your seed phrase');
      return;
    }

    if (!validateSeedPhrase(seedPhrase.trim())) {
      Alert.alert('Invalid Seed Phrase', 'Please check your 12 words and try again.');
      return;
    }

    setLoading(true);
    try {
      await login(seedPhrase.trim());
      router.replace('/map');
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.message || 'Invalid seed phrase. Please check and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Login</Text>
          </View>

          <View style={styles.iconContainer}>
            <Ionicons name="key" size={64} color="#9333EA" />
          </View>

          <Text style={styles.subtitle}>Enter your 12-word seed phrase</Text>

          <TextInput
            style={styles.input}
            placeholder="word1 word2 word3 ..."
            placeholderTextColor="#6B7280"
            value={seedPhrase}
            onChangeText={setSeedPhrase}
            multiline
            numberOfLines={4}
            autoCapitalize="none"
            autoCorrect={false}
            textAlignVertical="top"
          />

          <View style={styles.info}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              Enter all 12 words separated by spaces, in the correct order.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.warning}>
            <Ionicons name="warning" size={20} color="#F59E0B" />
            <Text style={styles.warningText}>
              If you lost your seed phrase, you cannot access this account. You'll need to
              create a new one.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 16,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#374151',
  },
  info: {
    flexDirection: 'row',
    backgroundColor: '#1E3A8A',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    color: '#93C5FD',
    fontSize: 13,
    marginLeft: 8,
  },
  loginButton: {
    backgroundColor: '#9333EA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#451A03',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  warningText: {
    flex: 1,
    color: '#FCD34D',
    fontSize: 13,
    marginLeft: 8,
  },
});