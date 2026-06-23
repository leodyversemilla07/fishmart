import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/authStore';
import { useAction, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { LucideHelpCircle, LucidePackageCheck, LucideSettings, LucideShoppingBag, LucideStore, LucideShieldCheck } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, Divider, List, Text, useTheme } from 'react-native-paper';

export default function ProfileScreen() {
    const { user, sessionToken, logout } = useAuthStore();
    const theme = useTheme();

    // Convex Query - skip if no user
    const profile = useQuery(api.users.getProfileById, sessionToken ? { sessionToken } : "skip");
    const signOut = useAction(api.auth.signOut);
    const loading = profile === undefined;

    const handleSignOut = async () => {
        if (sessionToken) {
            try {
                await signOut({ sessionToken });
            } catch (error) {
                console.error('Failed to revoke session:', error);
            }
        }
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
    const canSell = user.role === 'SELLER' || user.role === 'ADMIN';

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
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
                {canSell ? (
                    <List.Section style={styles.listSection}>
                        <List.Subheader>Seller Tools</List.Subheader>
                        <List.Item
                            title="Incoming Orders"
                            description="Manage orders from buyers"
                            left={() => <LucidePackageCheck size={24} color={theme.colors.outline} />}
                            right={() => <List.Icon icon="chevron-right" />}
                            onPress={() => router.push('/seller/orders')}
                        />
                        <Divider />
                        <List.Item
                            title="My Listings"
                            description="Manage your listed items"
                            left={() => <LucideStore size={24} color={theme.colors.outline} />}
                            right={() => <List.Icon icon="chevron-right" />}
                            onPress={() => router.push('/seller/listings')}
                        />
                        {user.role === 'ADMIN' && (
                            <>
                                <Divider />
                                <List.Item
                                    title="Reservation Metrics"
                                    description="Monitor order reservation health"
                                    left={() => <LucideShieldCheck size={24} color={theme.colors.outline} />}
                                    right={() => <List.Icon icon="chevron-right" />}
                                    onPress={() => router.push('/profile/reservations')}
                                />
                                <Divider />
                                <List.Item
                                    title="Admin Dashboard"
                                    description="Platform management panel"
                                    left={() => <LucideShieldCheck size={24} color={theme.colors.primary} />}
                                    right={() => <List.Icon icon="chevron-right" />}
                                    onPress={() => { router.push('/admin' as any); }}
                                />
                            </>
                        )}
                    </List.Section>
                ) : (
                    <Card style={styles.becomeSellerCard}>
                        <Card.Content>
                            <Text variant="titleMedium" style={styles.becomeSellerTitle}>Want to sell fish?</Text>
                            <Text variant="bodyMedium" style={styles.becomeSellerText}>
                                Create a seller profile to list products and manage buyer orders.
                            </Text>
                            <Button mode="contained" onPress={() => router.push('/(tabs)/sell')} style={styles.becomeSellerButton}>
                                Become a Seller
                            </Button>
                        </Card.Content>
                    </Card>
                )}

                <List.Section style={styles.listSection}>
                    <List.Subheader>Account Settings</List.Subheader>
                    <List.Item
                        title="My Orders"
                        left={() => <LucideShoppingBag size={24} color={theme.colors.outline} />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => router.push('/orders')}
                    />
                    <Divider />
                    <List.Item
                        title="Update Profile"
                        left={() => <LucideSettings size={24} color={theme.colors.outline} />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => router.push('/profile/update')}
                    />
                </List.Section>

                <List.Section style={styles.listSection}>
                    <List.Subheader>Support</List.Subheader>
                    <List.Item
                        title="Help Center"
                        left={() => <LucideHelpCircle size={24} color={theme.colors.outline} />}
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
    becomeSellerCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        marginBottom: 16,
        elevation: 1,
    },
    becomeSellerTitle: {
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 6,
    },
    becomeSellerText: {
        color: '#64748B',
        marginBottom: 14,
        lineHeight: 22,
    },
    becomeSellerButton: {
        borderRadius: 12,
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
