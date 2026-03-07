import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/authStore';
import { Conversation } from '@/types';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { LucideMessageSquare, LucideSearch } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Avatar, Divider, List, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MessagesScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { sessionToken } = useAuthStore();

    // Convex Query
    const conversationsQuery = useQuery(api.chat.getConversations, sessionToken ? { sessionToken } : "skip");
    const conversations = (conversationsQuery ?? []) as Conversation[];
    const loading = conversationsQuery === undefined;
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredConversations = conversations.filter((conv: Conversation) => {
        const otherParticipant = conv.otherUser;
        if (!otherParticipant) return false;

        const name = otherParticipant.shopName || `${otherParticipant.firstName} ${otherParticipant.middleName ? otherParticipant.middleName + ' ' : ''}${otherParticipant.lastName}`;
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const renderConversationItem = ({ item }: { item: Conversation }) => {
        const otherParticipant = item.otherUser;
        const lastMessage = item.lastMessage;
        const date = lastMessage ? new Date(lastMessage._creationTime).toLocaleDateString() : '';
        const name = otherParticipant?.shopName || `${otherParticipant?.firstName || 'User'} ${otherParticipant?.middleName ? otherParticipant.middleName + ' ' : ''}${otherParticipant?.lastName || ''}`;

        return (
            <List.Item
                title={name}
                description={lastMessage?.content || 'No messages yet'}
                left={props => (
                    <Avatar.Image
                        size={50}
                        source={{ uri: otherParticipant?.shopLogo || 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=100' }}
                    />
                )}
                right={() => <Text variant="bodySmall" style={styles.dateText}>{date}</Text>}
                onPress={() => router.push({
                    pathname: '/chat/[id]' as any, // Cast to any to avoid strict typing issues with dynamic routes for now if needed, or just string
                    params: {
                        id: item._id,
                        recipientName: name,
                        recipientId: otherParticipant?._id
                    }
                })}
                titleStyle={styles.conversationTitle}
                descriptionStyle={styles.lastMessage}
                style={styles.listItem}
            />
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Text variant="headlineMedium" style={styles.headerTitle}>Messages</Text>
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    mode="outlined"
                    style={styles.searchInput}
                    left={<TextInput.Icon icon={() => <LucideSearch size={20} color="#64748B" />} />}
                    outlineStyle={styles.searchOutline}
                />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredConversations}
                    renderItem={renderConversationItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <Divider style={styles.divider} />}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <LucideMessageSquare size={64} color="#CBD5E1" />
                            <Text variant="titleMedium" style={styles.emptyText}>No messages yet</Text>
                            <Text variant="bodyMedium" style={styles.emptySubtext}>Start chatting with sellers to inquire about fish!</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: '#1E293B',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    searchInput: {
        backgroundColor: '#F8FAFC',
        height: 44,
    },
    searchOutline: {
        borderRadius: 12,
        borderWidth: 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 20,
    },
    listItem: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    conversationTitle: {
        fontWeight: '600',
        color: '#1E293B',
    },
    lastMessage: {
        color: '#64748B',
    },
    dateText: {
        color: '#94A3B8',
        alignSelf: 'center',
    },
    divider: {
        backgroundColor: '#F1F5F9',
        marginHorizontal: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontWeight: 'bold',
        marginTop: 16,
        color: '#1E293B',
    },
    emptySubtext: {
        color: '#64748B',
        marginTop: 4,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});
