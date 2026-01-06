import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { LucideHelpCircle, LucidePackageCheck, LucideSettings, LucideShoppingBag, LucideStore } from 'lucide-react-native';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, Divider, List, Text, useTheme } from 'react-native-paper';

export default function ProfileScreen() {
    const { user, logout } = useAuthStore();
    const theme = useTheme();

    // Convex Query - skip if no user
    const profile = useQuery(api.users.getProfileById, user ? { userId: user._id as any } : "skip");
    const loading = profile === undefined;
    const [refreshing, setRefreshing] = useState(false);

    const handleSignOut = () => {
        logout();
        router.replace('/login');
    };

    if (!user) {
        return (
            <View style={styles.centered}>
                <Text>Please log in to view your profile.</Text>
                <Button mode="contained" onPress={() => router.replace('/login')} style={styles.margin}>
                    Go to Login
                </Button>
            </View>
        );
    }

    const initials = profile
        ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`
        : user.firstName?.substring(0, 1) || 'U';

    const fullName = profile
        ? `${profile.firstName} ${profile.middleName ? profile.middleName + ' ' : ''}${profile.lastName}`
        : `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`;

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { }} />
            }
        >
            {/* Profile Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                {loading ? (
                    <ActivityIndicator size="small" color="white" />
                ) : (
                    <Avatar.Text
                        size={80}
                        label={initials}
                        style={styles.avatar}
                    />
                )}
                <Text variant="headlineSmall" style={styles.userName}>
                    {fullName}
                </Text>
                <Text variant="bodyMedium" style={styles.userEmail}>{user.email}</Text>

                <View style={styles.badgeContainer}>
                    <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <Text style={styles.badgeText}>Member</Text>
                    </View>
                </View>
            </View>

            <View style={styles.content}>
                {/* Statistics */}
                <View style={styles.statsRow}>
                    <Card style={styles.statCard}>
                        <Card.Content style={styles.statContent}>
                            <LucideShoppingBag size={24} color={theme.colors.primary} />
                            <Text variant="titleMedium" style={styles.statNumber}>
                                {profile?._count?.orders || 0}
                            </Text>
                            <Text variant="labelSmall">Orders</Text>
                        </Card.Content>
                    </Card>
                    <Card style={styles.statCard}>
                        <Card.Content style={styles.statContent}>
                            <LucideStore size={24} color={theme.colors.primary} />
                            <Text variant="titleMedium" style={styles.statNumber}>
                                {profile?._count?.products || 0}
                            </Text>
                            <Text variant="labelSmall">Selling</Text>
                        </Card.Content>
                    </Card>
                </View>

                {/* Seller Tools */}
                <List.Section style={styles.listSection}>
                    <List.Subheader>Seller Tools</List.Subheader>
                    <List.Item
                        title="Incoming Orders"
                        description="Manage orders from buyers"
                        left={(props: any) => <LucidePackageCheck {...props} size={24} color={theme.colors.outline} />}
                        right={(props: any) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => router.push('/seller/orders')}
                    />
                    <Divider />
                    <List.Item
                        title="My Listings"
                        description="Manage your listed items"
                        left={(props: any) => <LucideStore {...props} size={24} color={theme.colors.outline} />}
                        right={(props: any) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => router.push('/seller/listings')}
                    />
                </List.Section>

                <List.Section style={styles.listSection}>
                    <List.Subheader>Account Settings</List.Subheader>
                    <List.Item
                        title="My Orders"
                        left={(props: any) => <LucideShoppingBag {...props} size={24} color={theme.colors.outline} />}
                        right={(props: any) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => router.push('/orders')}
                    />
                    <Divider />
                    <List.Item
                        title="Update Profile"
                        left={(props: any) => <LucideSettings {...props} size={24} color={theme.colors.outline} />}
                        right={(props: any) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => router.push('/profile/update')}
                    />
                </List.Section>

                <List.Section style={styles.listSection}>
                    <List.Subheader>Support</List.Subheader>
                    <List.Item
                        title="Help Center"
                        left={(props: any) => <LucideHelpCircle {...props} size={24} color={theme.colors.outline} />}
                        onPress={() => { }}
                    />
                </List.Section>


                <Button
                    mode="outlined"
                    onPress={handleSignOut}
                    icon="logout"
                    style={styles.signOutButton}
                    textColor={theme.colors.error}
                >
                    Sign Out
                </Button>

                <Text variant="labelSmall" style={styles.versionText}>Fishmart v1.0.0</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    margin: {
        marginTop: 16,
    },
    header: {
        padding: 40,
        paddingTop: 60,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    avatar: {
        backgroundColor: 'white',
        elevation: 4,
        marginBottom: 16,
    },
    userName: {
        color: 'white',
        fontWeight: 'bold',
    },
    userEmail: {
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    badgeContainer: {
        marginTop: 12,
        flexDirection: 'row',
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -40,
        marginBottom: 20,
    },
    statCard: {
        width: '47%',
        borderRadius: 15,
        elevation: 2,
        backgroundColor: 'white',
    },
    statContent: {
        alignItems: 'center',
        paddingVertical: 15,
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
    signOutButton: {
        marginTop: 8,
        borderRadius: 12,
        borderColor: '#ff4d4d',
    },
    versionText: {
        textAlign: 'center',
        color: '#aaa',
        marginTop: 24,
        marginBottom: 0,
    },
});
