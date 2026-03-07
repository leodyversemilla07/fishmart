import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/authStore';
import { ChatMessage } from '@/types';
import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { LucideArrowLeft, LucideInfo, LucideSend } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatRoomScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { id, recipientName, recipientId } = useLocalSearchParams<{ id: string; recipientName: string; recipientId: string }>();
    const { convexUser, sessionToken } = useAuthStore();

    // Convex Hooks
    const messagesQuery = useQuery(api.chat.getMessages, id && sessionToken ? { sessionToken, conversationId: id as Id<"conversations"> } : "skip");
    const messages = messagesQuery ?? [];
    const sendMessage = useMutation(api.chat.sendMessage);

    const loading = messagesQuery === undefined;
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const handleSend = async () => {
        if (!messageText.trim()) return;

        if (!convexUser?._id || !sessionToken) {
            console.error('No user logged in');
            return;
        }

        setSending(true);
        const textToBatch = messageText;
        setMessageText('');

        try {
            await sendMessage({
                sessionToken,
                conversationId: id as Id<"conversations">,
                content: textToBatch,
            });
            setTimeout(() => flatListRef.current?.scrollToEnd(), 200);
        } catch (error) {
            console.error('Error sending message:', error);
            setMessageText(textToBatch); // Restore text on error
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }: { item: ChatMessage }) => {
        const isMe = item.senderId === convexUser?._id;

        return (
            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                    {item.content}
                </Text>
                <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.theirTimeText]}>
                    {new Date(item._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <LucideArrowLeft size={24} color="black" />
                    </TouchableOpacity>
                    <Avatar.Text
                        size={36}
                        label={recipientName?.[0] || 'U'}
                        style={styles.headerAvatar}
                    />
                    <View style={styles.headerInfo}>
                        <Text variant="titleMedium" style={styles.recipientName}>{recipientName || 'User'}</Text>
                        <Text variant="labelSmall" style={styles.statusText}>Active now</Text>
                    </View>
                </View>
                <IconButton icon={() => <LucideInfo size={20} color="#64748B" />} onPress={() => { }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.messageList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                />
            )}

            <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 10 }]}>
                <TextInput
                    placeholder="Type a message..."
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    style={styles.input}
                />
                <TouchableOpacity
                    style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}
                    disabled={!messageText.trim() || sending}
                    onPress={handleSend}
                >
                    {sending ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <LucideSend size={20} color="white" />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 8,
    },
    headerAvatar: {
        backgroundColor: '#F1F5F9',
        marginHorizontal: 8,
    },
    headerInfo: {
        justifyContent: 'center',
    },
    recipientName: {
        fontWeight: 'bold',
        color: '#1E293B',
    },
    statusText: {
        color: '#22C55E',
        marginTop: -2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageList: {
        padding: 16,
        paddingBottom: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 20,
        marginBottom: 8,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#0061A4',
        borderBottomRightRadius: 4,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#F1F5F9',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: 'white',
    },
    theirMessageText: {
        color: '#1E293B',
    },
    timeText: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    myTimeText: {
        color: 'rgba(255,255,255,0.7)',
    },
    theirTimeText: {
        color: '#94A3B8',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        backgroundColor: 'white',
    },
    input: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        marginRight: 10,
        maxHeight: 100,
        paddingHorizontal: 5,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
