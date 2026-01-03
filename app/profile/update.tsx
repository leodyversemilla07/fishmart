import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/authStore';
import { pickImage, uploadImage } from '@/utils/upload';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { LucideArrowLeft, LucideCamera, LucidePhone, LucideStore, LucideUser } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function UpdateProfileScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { user, convexUser } = useAuthStore();

    // Convex Hooks
    const profile = useQuery(api.users.getProfileById, user ? { userId: user._id as any } : "skip");
    const updateProfile = useMutation(api.users.updateProfile);

    const [saving, setSaving] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [shopName, setShopName] = useState('');
    const [shopDescription, setShopDescription] = useState('');
    const [shopLogo, setShopLogo] = useState('');
    const [newImage, setNewImage] = useState<{ uri: string, base64?: string | null } | null>(null);

    useEffect(() => {
        if (profile) {
            setFirstName(profile.firstName || '');
            setLastName(profile.lastName || '');
            setPhoneNumber(profile.phoneNumber || '');
            setShopName(profile.shopName || '');
            setShopDescription(profile.shopDescription || '');
            setShopLogo(profile.shopLogo || '');
        }
    }, [profile]);

    const handlePickImage = async () => {
        try {
            const result = await pickImage(false, [1, 1]); // allowsMultiple=false, aspect=[1,1]
            if (result && !result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setNewImage({ uri: asset.uri, base64: asset.base64 });
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleSave = async () => {
        if (!user?._id) return;

        setSaving(true);
        try {
            let logoUrl = shopLogo; // This might be a full URL from previous load

            // If new image, upload and get new Storage ID
            if (newImage) {
                // uploadImage returns storageId
                logoUrl = await uploadImage(newImage.uri, newImage.base64, 'avatars', 'profiles');
            }

            // Note: if we didn't change image, logoUrl is the resolved URL.
            // Ideally we shouldn't save the resolved URL back to the DB if we want to keep it as Storage ID.
            // But we don't have the original Storage ID unless we stored it separately.
            // However, `updateProfile` updates only fields passed.
            // If we didn't change the image, we shouldn't pass `shopLogo` unless we want to overwrite.
            // Logic: if `newImage` is present, pass `shopLogo`. If not, don't pass `shopLogo` to avoid overwriting 
            // storage ID with signed URL (which expires).

            const updates: any = {
                id: user._id as any,
                firstName,
                lastName,
                phoneNumber,
                shopName,
                shopDescription,
            };

            if (newImage) {
                updates.shopLogo = logoUrl;
            }

            await updateProfile(updates);

            Alert.alert('Success', 'Profile updated successfully');
            router.back();
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (profile === undefined) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <LucideArrowLeft size={24} color="black" />
                </TouchableOpacity>
                <Text variant="titleLarge" style={styles.headerTitle}>Update Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
                {/* Avatar / Logo Section */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarWrapper}>
                        {newImage ? (
                            <Avatar.Image size={100} source={{ uri: newImage.uri }} />
                        ) : shopLogo ? (
                            <Avatar.Image size={100} source={{ uri: shopLogo }} />
                        ) : (
                            <Avatar.Icon size={100} icon="account" style={{ backgroundColor: theme.colors.primaryContainer }} />
                        )}
                        <TouchableOpacity
                            style={[styles.cameraButton, { backgroundColor: theme.colors.primary }]}
                            onPress={handlePickImage}
                        >
                            <LucideCamera size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                    <Text variant="bodySmall" style={styles.avatarHint}>Tap to change shop logo or avatar</Text>
                </View>

                {/* Personal Info */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <LucideUser size={20} color={theme.colors.primary} />
                        <Text variant="titleMedium" style={styles.sectionTitle}>Personal Information</Text>
                    </View>
                    <TextInput
                        label="First Name"
                        value={firstName}
                        onChangeText={setFirstName}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Last Name"
                        value={lastName}
                        onChangeText={setLastName}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Phone Number"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        mode="outlined"
                        keyboardType="phone-pad"
                        style={styles.input}
                        left={<TextInput.Icon icon={() => <LucidePhone size={20} color="#64748B" />} />}
                    />
                </View>

                {/* Shop Info */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <LucideStore size={20} color={theme.colors.primary} />
                        <Text variant="titleMedium" style={styles.sectionTitle}>Shop Information (Sellers)</Text>
                    </View>
                    <TextInput
                        label="Shop Name"
                        value={shopName}
                        onChangeText={setShopName}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Shop Description"
                        value={shopDescription}
                        onChangeText={setShopDescription}
                        mode="outlined"
                        multiline
                        numberOfLines={4}
                        style={styles.input}
                    />
                </View>

                <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={saving}
                    disabled={saving}
                    style={styles.saveButton}
                    contentStyle={styles.saveButtonContent}
                >
                    Save Changes
                </Button>
            </ScrollView>
        </View>
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
        paddingHorizontal: 16,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitle: {
        fontWeight: 'bold',
    },
    backButton: {
        padding: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarWrapper: {
        position: 'relative',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'white',
    },
    avatarHint: {
        marginTop: 12,
        color: '#64748B',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginLeft: 10,
        color: '#1E293B',
    },
    input: {
        marginBottom: 12,
        backgroundColor: 'white',
    },
    saveButton: {
        marginTop: 10,
        borderRadius: 12,
        elevation: 0,
    },
    saveButtonContent: {
        paddingVertical: 8,
    },
});
