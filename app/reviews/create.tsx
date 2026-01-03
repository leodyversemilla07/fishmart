import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/authStore';
import { pickImage, uploadImage } from '@/utils/upload';
import { useMutation } from 'convex/react';
import { Image as ExpoImage } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { LucideArrowLeft, LucideCamera, LucideStar, LucideX } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateReviewScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { productId, name } = useLocalSearchParams<{ productId: string; name: string }>();
    const { convexUser } = useAuthStore();

    const createReviewMutation = useMutation(api.reviews.create);

    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [images, setImages] = useState<{ uri: string, base64?: string | null }[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const handleAddPhoto = async () => {
        if (images.length >= 5) {
            Alert.alert('Limit reached', 'You can upload up to 5 photos.');
            return;
        }
        try {
            const result = await pickImage(false, [4, 3]);
            if (result && !result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setImages([...images, { uri: asset.uri, base64: asset.base64 }]);
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const removePhoto = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!productId) return;
        if (!convexUser) {
            Alert.alert('Error', 'You must be logged in to review.');
            return;
        }

        setSubmitting(true);
        try {
            // Upload all images first
            const uploadedUrls: string[] = await Promise.all(
                images.map(async (img) => {
                    if (img.base64) {
                        return await uploadImage(img.uri, img.base64, 'reviews', `products/${productId}`);
                    }
                    return img.uri; // Should not happen with new images
                })
            );

            await createReviewMutation({
                productId: productId as any,
                userId: convexUser._id as any,
                rating,
                comment,
                images: uploadedUrls,
            });

            Alert.alert('Success', 'Thank you for your review!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            console.error('Error submitting review:', error);
            Alert.alert('Error', error.message || 'Failed to submit review.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <LucideArrowLeft size={24} color="black" />
                </TouchableOpacity>
                <Text variant="titleLarge" style={styles.headerTitle}>Write a Review</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text variant="titleMedium" style={styles.productName}>{name || 'Product'}</Text>

                <View style={styles.ratingSection}>
                    <Text variant="bodyLarge" style={styles.label}>Rate your experience</Text>
                    <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                <LucideStar
                                    size={40}
                                    color={star <= rating ? "#FFB800" : "#E2E8F0"}
                                    fill={star <= rating ? "#FFB800" : "transparent"}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text variant="bodyMedium" style={styles.ratingLabel}>
                        {rating === 1 ? 'Terrible' : rating === 2 ? 'Poor' : rating === 3 ? 'Fair' : rating === 4 ? 'Good' : 'Excellent'}
                    </Text>
                </View>

                <View style={styles.inputSection}>
                    <Text variant="bodyLarge" style={styles.label}>Your Feedback</Text>
                    <TextInput
                        mode="outlined"
                        placeholder="What did you like or dislike? How was the quality of the fish?"
                        multiline
                        numberOfLines={6}
                        value={comment}
                        onChangeText={setComment}
                        style={styles.textArea}
                    />
                </View>

                {/* Photo Upload Placeholder */}
                <View style={styles.photoSection}>
                    <Text variant="bodyLarge" style={styles.label}>Add Photos (Optional)</Text>
                    <View style={styles.photoList}>
                        {images.map((img, index) => (
                            <View key={index} style={styles.photoWrapper}>
                                <ExpoImage source={{ uri: img.uri }} style={styles.photoThumbnail} />
                                <TouchableOpacity
                                    style={styles.removePhotoBtn}
                                    onPress={() => removePhoto(index)}
                                >
                                    <LucideX size={12} color="white" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {images.length < 5 && (
                            <TouchableOpacity style={styles.photoUploadBtn} onPress={handleAddPhoto}>
                                <LucideCamera size={24} color={theme.colors.primary} />
                                <Text style={{ color: theme.colors.primary, marginTop: 4, fontSize: 12 }}>Add Photo</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={submitting}
                    disabled={submitting}
                    style={styles.submitBtn}
                >
                    Submit Review
                </Button>
            </View>
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
    scrollContent: {
        padding: 20,
    },
    productName: {
        textAlign: 'center',
        marginBottom: 30,
        fontWeight: 'bold',
    },
    ratingSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    label: {
        fontWeight: '600',
        marginBottom: 10,
        color: '#1E293B',
    },
    starsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginVertical: 10,
    },
    ratingLabel: {
        color: '#64748B',
        fontWeight: '600',
    },
    inputSection: {
        marginBottom: 30,
    },
    textArea: {
        backgroundColor: 'white',
    },
    photoSection: {
        marginBottom: 100,
    },
    photoList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    photoWrapper: {
        position: 'relative',
    },
    photoThumbnail: {
        width: 100,
        height: 100,
        borderRadius: 12,
    },
    removePhotoBtn: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoUploadBtn: {
        width: 100,
        height: 100,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    submitBtn: {
        borderRadius: 12,
        paddingVertical: 6,
    }
});
