import { useAuthStore } from '@/store/authStore';
import { LucideActivity, LucidePackage, LucideShoppingBag, LucideUsers, LucideAlertCircle, LucideSettings } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Divider, List, Text, useTheme } from 'react-native-paper';

export default function AdminDashboardScreen() {
    const { user } = useAuthStore();
    const theme = useTheme();

    if (!user || user.role !== 'ADMIN') return null;

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.content}>
                <Text variant="headlineSmall" style={styles.greeting}>
                    Welcome, {user.firstName}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
                    Fishmart Admin Panel
                </Text>

                {/* Quick Stats */}
                <View style={styles.statsGrid}>
                    <Card style={[styles.statCard, { backgroundColor: theme.colors.primaryContainer }]}>
                        <Card.Content style={styles.statContent}>
                            <LucideUsers size={28} color={theme.colors.primary} />
                            <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.primary }]}>—</Text>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Users</Text>
                        </Card.Content>
                    </Card>
                    <Card style={[styles.statCard, { backgroundColor: theme.colors.tertiaryContainer }]}>
                        <Card.Content style={styles.statContent}>
                            <LucidePackage size={28} color={theme.colors.tertiary} />
                            <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.tertiary }]}>—</Text>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Products</Text>
                        </Card.Content>
                    </Card>
                    <Card style={[styles.statCard, { backgroundColor: theme.colors.secondaryContainer }]}>
                        <Card.Content style={styles.statContent}>
                            <LucideShoppingBag size={28} color={theme.colors.secondary} />
                            <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.secondary }]}>—</Text>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Orders</Text>
                        </Card.Content>
                    </Card>
                    <Card style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
                        <Card.Content style={styles.statContent}>
                            <LucideActivity size={28} color="#E65100" />
                            <Text variant="titleLarge" style={[styles.statNumber, { color: '#E65100' }]}>—</Text>
                            <Text variant="labelSmall" style={{ color: '#666' }}>Reports</Text>
                        </Card.Content>
                    </Card>
                </View>

                {/* Management Sections */}
                <List.Section style={styles.listSection}>
                    <List.Subheader>Manage</List.Subheader>
                    <List.Item
                        title="Manage Users"
                        description="View, verify, suspend user accounts"
                        left={() => <LucideUsers size={24} color={theme.colors.outline} />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => {}}
                    />
                    <Divider />
                    <List.Item
                        title="Manage Categories"
                        description="Add, edit, or disable product categories"
                        left={() => <LucidePackage size={24} color={theme.colors.outline} />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => {}}
                    />
                    <Divider />
                    <List.Item
                        title="All Orders"
                        description="View and manage all platform orders"
                        left={() => <LucideShoppingBag size={24} color={theme.colors.outline} />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => {}}
                    />
                    <Divider />
                    <List.Item
                        title="Reports & Analytics"
                        description="Platform metrics and insights"
                        left={() => <LucideActivity size={24} color={theme.colors.outline} />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => {}}
                    />
                </List.Section>

                {/* Moderation */}
                <List.Section style={styles.listSection}>
                    <List.Subheader>Moderation</List.Subheader>
                    <List.Item
                        title="Flagged Content"
                        description="Review reported products and reviews"
                        left={() => <LucideAlertCircle size={24} color={theme.colors.error} />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => {}}
                    />
                    <Divider />
                    <List.Item
                        title="Settings"
                        description="Platform configuration"
                        left={() => <LucideSettings size={24} color={theme.colors.outline} />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => {}}
                    />
                </List.Section>

                <View style={{ height: 40 }} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    greeting: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statCard: {
        width: '48%',
        borderRadius: 15,
        marginBottom: 12,
    },
    statContent: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    statNumber: {
        fontWeight: 'bold',
        marginTop: 8,
    },
    listSection: {
        backgroundColor: 'white',
        borderRadius: 15,
        overflow: 'hidden',
        marginBottom: 16,
        elevation: 1,
    },
});