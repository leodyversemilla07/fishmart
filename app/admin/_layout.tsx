import { useAuthStore } from '@/store/authStore';
import { router, Stack } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { LucideArrowLeft, LucideShield } from 'lucide-react-native';

export default function AdminLayout() {
    const { user } = useAuthStore();
    const theme = useTheme();

    if (!user || user.role !== 'ADMIN') {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <LucideShield size={48} color={theme.colors.error} />
                <Text variant="bodyLarge" style={{ color: theme.colors.error, marginTop: 16 }}>
                    Access Denied
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
                    Admin privileges required.
                </Text>
            </View>
        );
    }

    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: theme.colors.primary },
                headerTintColor: 'white',
                headerTitleStyle: { fontWeight: 'bold' },
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: 'Admin Dashboard',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
                            <LucideArrowLeft color="white" size={24} />
                        </TouchableOpacity>
                    ),
                }}
            />
        </Stack>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
});