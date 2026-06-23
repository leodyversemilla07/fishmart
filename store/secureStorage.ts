import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

const isSecureStoreAvailable = () => Platform.OS !== 'web';

/**
 * Zustand-compatible persisted storage that keeps auth data in SecureStore on
 * native platforms and migrates existing AsyncStorage values on first read.
 */
export const secureAuthStorage: StateStorage = {
    getItem: async (name: string) => {
        if (!isSecureStoreAvailable()) {
            return AsyncStorage.getItem(name);
        }

        const secureValue = await SecureStore.getItemAsync(name);
        if (secureValue) {
            return secureValue;
        }

        // One-time migration from the previous AsyncStorage-backed auth store.
        const legacyValue = await AsyncStorage.getItem(name);
        if (legacyValue) {
            await SecureStore.setItemAsync(name, legacyValue);
            await AsyncStorage.removeItem(name);
        }

        return legacyValue;
    },

    setItem: async (name: string, value: string) => {
        if (!isSecureStoreAvailable()) {
            await AsyncStorage.setItem(name, value);
            return;
        }

        await SecureStore.setItemAsync(name, value);
        await AsyncStorage.removeItem(name);
    },

    removeItem: async (name: string) => {
        if (isSecureStoreAvailable()) {
            await SecureStore.deleteItemAsync(name);
        }
        await AsyncStorage.removeItem(name);
    },
};
