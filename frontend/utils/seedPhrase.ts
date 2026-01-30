import * as bip39 from 'bip39';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

export const generateSeedPhrase = (): string => {
  return bip39.generateMnemonic();
};

export const validateSeedPhrase = (phrase: string): boolean => {
  return bip39.validateMnemonic(phrase);
};

export const hashSeedPhrase = async (phrase: string, deviceSalt: string): Promise<string> => {
  const combined = phrase + deviceSalt;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined
  );
  return hash;
};

export const getDeviceSalt = async (): Promise<string> => {
  try {
    let salt = await SecureStore.getItemAsync('device_salt');
    if (!salt) {
      // Generate new salt
      salt = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${Date.now()}_${Math.random()}_${Platform.OS}`
      );
      await SecureStore.setItemAsync('device_salt', salt);
    }
    return salt;
  } catch (error) {
    console.error('Error managing device salt:', error);
    throw error;
  }
};

export const storeSeedHash = async (hash: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync('seed_hash', hash);
  } catch (error) {
    console.error('Error storing seed hash:', error);
    throw error;
  }
};

export const getSeedHash = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync('seed_hash');
  } catch (error) {
    console.error('Error retrieving seed hash:', error);
    return null;
  }
};

export const clearAuth = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync('seed_hash');
  } catch (error) {
    console.error('Error clearing auth:', error);
  }
};