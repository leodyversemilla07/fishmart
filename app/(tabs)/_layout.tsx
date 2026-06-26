import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from 'convex/react';
import { Tabs } from 'expo-router';
import { LucideHome, LucideMessageCircle, LucidePlusCircle, LucideSearch, LucideUser } from 'lucide-react-native';
import React from 'react';
import { Platform, View } from 'react-native';
import { Badge, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function MessagesTabIcon({ color, size }: { color: string; size: number }) {
    const { sessionToken } = useAuthStore();
    const unreadCount = useQuery(
        api.chat.getUnreadMessageCount,
        sessionToken ? { sessionToken } : "skip"
    );

    return (
        <View style={{ position: 'relative' }}>
            <LucideMessageCircle size={size} color={color} />
            {unreadCount !== undefined && unreadCount > 0 && (
                <Badge
                    size={18}
                    style={{
                        position: 'absolute',
                        top: -6,
                        right: -8,
                    }}
                >
                    {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
            )}
        </View>
    );
}

export default function TabLayout() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    // Calculate proper bottom padding for the tab bar
    const tabBarHeight = 60;
    const bottomPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 10) : insets.bottom;

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.outline,
                headerShown: false,
                tabBarStyle: {
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    height: tabBarHeight + bottomPadding,
                    paddingBottom: bottomPadding,
                    paddingTop: 5,
                    backgroundColor: theme.colors.elevation.level2,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                },
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => <LucideHome size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    title: 'Explore',
                    tabBarIcon: ({ color, size }) => <LucideSearch size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="sell"
                options={{
                    title: 'Sell',
                    tabBarIcon: ({ color, size }) => <LucidePlusCircle size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: 'Messages',
                    tabBarIcon: ({ color, size }) => <MessagesTabIcon color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => <LucideUser size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}