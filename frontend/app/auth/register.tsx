import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { generateSeedPhrase, getDeviceSalt, hashSeedPhrase } from '../../utils/seedPhrase';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [seedPhrase, setSeedPhrase] = useState('');
  const [step, setStep] = useState(1); // 1: Generate, 2: Confirm, 3: Complete
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [confirmWords, setConfirmWords] = useState<{ index: number; word: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const phrase = generateSeedPhrase();
    setSeedPhrase(phrase);
    
    // Select 3 random words to confirm (e.g., 3rd, 7th, 11th)
    const indices = [2, 6, 10]; // 0-indexed
    setSelectedWords(indices);
    
    const words = phrase.split(' ');
    setConfirmWords(
      indices.map((idx) => ({ index: idx + 1, word: words[idx] }))
    );
  }, []);

  const copySeedPhrase = async () => {
    await Clipboard.setStringAsync(seedPhrase);
    Alert.alert('Copied', 'Seed phrase copied to clipboard');
    
    // Clear clipboard after 60 seconds for security
    setTimeout(async () => {
      await Clipboard.setStringAsync('');
    }, 60000);
  };

  const [userAnswers, setUserAnswers] = useState<string[]>(['', '', '']);

  const verifyAndRegister = async () => {
    // Verify user answers
    const correct = confirmWords.every(
      (item, idx) => userAnswers[idx].trim().toLowerCase() === item.word.toLowerCase()
    );

    if (!correct) {
      Alert.alert('Incorrect', 'The words you entered do not match. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const deviceSalt = await getDeviceSalt();
      const hash = await hashSeedPhrase(seedPhrase, deviceSalt);

      await api.register({ seed_hash: hash, device_salt: deviceSalt });
      await register(hash);

      Alert.alert(
        'Success!',
        'Account created successfully. You can now use the app.',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/map'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const words = seedPhrase.split(' ');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {step === 1 && (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.title}>Your Seed Phrase</Text>
            </View>

            <View style={styles.warning}>
              <Ionicons name="warning" size={24} color="#DC2626" />
              <Text style={styles.warningText}>
                <Text style={{ fontWeight: 'bold' }}>CRITICAL:</Text> Write this down on paper.
                If you lose these words, your account is{' '}
                <Text style={{ fontWeight: 'bold' }}>PERMANENTLY LOST</Text>.
                No recovery possible.
              </Text>
            </View>

            <View style={styles.seedContainer}>
              {words.map((word, index) => (
                <View key={index} style={styles.wordItem}>
                  <Text style={styles.wordNumber}>{index + 1}</Text>
                  <Text style={styles.wordText}>{word}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.copyButton} onPress={copySeedPhrase}>
              <Ionicons name="copy-outline" size={20} color="#9333EA" />
              <Text style={styles.copyButtonText}>Copy to Clipboard (60s)</Text>
            </TouchableOpacity>

            <View style={styles.instructions}>
              <Text style={styles.instructionText}>
                • Write these 12 words on paper in order
              </Text>
              <Text style={styles.instructionText}>
                • Store in a safe place
              </Text>
              <Text style={styles.instructionText}>
                • Never share with anyone
              </Text>
              <Text style={styles.instructionText}>
                • No screenshots - they can be hacked
              </Text>
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setStep(2)}
            >
              <Text style={styles.nextButtonText}>I've Written It Down</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setStep(1)}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.title}>Verify Seed Phrase</Text>
            </View>

            <Text style={styles.subtitle}>
              Enter the following words to confirm you saved them:
            </Text>

            {confirmWords.map((item, idx) => (
              <View key={idx} style={styles.confirmItem}>
                <Text style={styles.confirmLabel}>Word #{item.index}:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter word"
                  placeholderTextColor="#6B7280"
                  value={userAnswers[idx]}
                  onChangeText={(text) => {
                    const newAnswers = [...userAnswers];
                    newAnswers[idx] = text;
                    setUserAnswers(newAnswers);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[
                styles.verifyButton,
                loading && styles.buttonDisabled,
              ]}
              onPress={verifyAndRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  warning: {
    flexDirection: 'row',
    backgroundColor: '#450A0A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  warningText: {
    flex: 1,
    color: '#FCA5A5',
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
  seedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  wordItem: {
    width: '48%',
    backgroundColor: '#1F2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordNumber: {
    color: '#6B7280',
    fontSize: 12,
    marginRight: 8,
    width: 20,
  },
  wordText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#9333EA',
    borderRadius: 8,
    marginBottom: 24,
  },
  copyButtonText: {
    color: '#9333EA',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  instructions: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  instructionText: {
    color: '#D1D5DB',
    fontSize: 14,
    marginBottom: 8,
  },
  nextButton: {
    backgroundColor: '#9333EA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  confirmItem: {
    marginBottom: 20,
  },
  confirmLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  verifyButton: {
    backgroundColor: '#9333EA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});