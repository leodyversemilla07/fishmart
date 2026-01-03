import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/authStore';
import { Category } from '@/types';
import { pickImage, uploadImage } from '@/utils/upload';
import { useMutation, useQuery } from 'convex/react';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import { LucideCamera } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SellScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { isAuthenticated, convexUser } = useAuthStore();

    // Convex Hooks
    const categories = useQuery(api.categories.list) || [];
    const createProduct = useMutation(api.products.create);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('1');
    const [category, setCategory] = useState('');
    const [location, setLocation] = useState('');

    // Image state
    const [images, setImages] = useState<any[]>([]); // { uri, base64? }

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePickImages = async () => {
        try {
            const result = await pickImage(true); // Allow multiple
            if (result && !result.canceled) {
                if (result.assets) {
                    setImages(prev => [...prev, ...result.assets]);
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        // Validation
        if (!name.trim()) {
            setError('Please enter a product name');
            return;
        }
        if (!description.trim()) {
            setError('Please enter a description');
            return;
        }
        if (!price || parseFloat(price) <= 0) {
            setError('Please enter a valid price');
            return;
        }
        if (!category) {
            setError('Please select a category');
            return;
        }
        if (!location.trim()) {
            setError('Please enter your location');
            return;
        }
        if (!isAuthenticated || !convexUser) {
            Alert.alert('Login Required', 'Please login to list a product', [
                { text: 'Login', onPress: () => router.push('/login') },
                { text: 'Cancel', style: 'cancel' },
            ]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Upload images first
            const uploadedUrls: string[] = [];
            for (const img of images) {
                if (img.base64) {
                    const url = await uploadImage(img.uri, img.base64, 'products', 'listings');
                    uploadedUrls.push(url);
                }
            }

            // Call Convex mutation
            await createProduct({
                sellerId: convexUser!._id as Id<"users">,
                name: name.trim(),
                description: description.trim(),
                price: parseFloat(price),
                stock: parseInt(stock) || 1,
                categoryId: category as Id<"categories">,
                city: location.trim(),
                province: location.trim(),
                images: uploadedUrls,
            });

            Alert.alert(
                'Success! 🎉',
                'Your product has been listed successfully!',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            // Reset form
                            setName('');
                            setDescription('');
                            setPrice('');
                            setStock('1');
                            setCategory('');
                            setLocation('');
                            setImages([]);
                            router.push('/(tabs)/explore');
                        },
                    },
                ]
            );
        } catch (err: any) {
            setError(err.message || 'Failed to list product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={styles.headerTitle}>
                        List Your Product
                    </Text>
                    <Text variant="bodyMedium" style={styles.headerSubtitle}>
                        Share your aquatic pets with the community
                    </Text>
                </View>

                {/* Photo Placeholder */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Photos</Text>
                    <View style={styles.photoList}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <TouchableOpacity
                                style={[styles.addImageButton, { borderColor: theme.colors.primary }]}
                                onPress={handlePickImages}
                            >
                                <LucideCamera size={32} color={theme.colors.primary} />
                                <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                                    Add
                                </Text>
                            </TouchableOpacity>

                            {images.map((img, index) => (
                                <View key={index} style={styles.photoWrapper}>
                                    <ExpoImage source={{ uri: img.uri }} style={styles.photoThumbnail} />
                                    <TouchableOpacity
                                        style={styles.removePhotoBtn}
                                        onPress={() => removeImage(index)}
                                    >
                                        <Text style={{ color: 'white', fontSize: 10 }}>X</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                    <Text variant="bodySmall" style={styles.photoHint}>
                        Add up to 5 photos. First photo will be the cover.
                    </Text>
                </View>

                {/* Product Details */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Product Details</Text>

                    <TextInput
                        label="Product Name"
                        value={name}
                        onChangeText={setName}
                        mode="outlined"
                        style={styles.input}
                        placeholder="e.g. Premium Moscow Blue Guppy Pair"
                        outlineStyle={{ borderRadius: 12 }}
                    />

                    <TextInput
                        label="Description"
                        value={description}
                        onChangeText={setDescription}
                        mode="outlined"
                        style={styles.input}
                        placeholder="Describe your product..."
                        multiline
                        numberOfLines={4}
                        outlineStyle={{ borderRadius: 12 }}
                    />

                    <View style={styles.row}>
                        <TextInput
                            label="Price (₱)"
                            value={price}
                            onChangeText={setPrice}
                            mode="outlined"
                            style={[styles.input, styles.halfInput]}
                            keyboardType="numeric"
                            placeholder="0.00"
                            outlineStyle={{ borderRadius: 12 }}
                        />
                        <TextInput
                            label="Stock Quantity"
                            value={stock}
                            onChangeText={setStock}
                            mode="outlined"
                            style={[styles.input, styles.halfInput]}
                            keyboardType="numeric"
                            placeholder="1"
                            outlineStyle={{ borderRadius: 12 }}
                        />
                    </View>
                </View>

                {/* Category */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Category</Text>
                    <View style={styles.categoryGrid}>
                        {categories.map((cat: Category) => (
                            <TouchableOpacity
                                key={cat._id}
                                style={[
                                    styles.categoryButton,
                                    category === cat._id && {
                                        backgroundColor: theme.colors.primaryContainer,
                                        borderColor: theme.colors.primary,
                                    },
                                ]}
                                onPress={() => setCategory(cat._id)}
                            >
                                <Text
                                    variant="bodyMedium"
                                    style={[
                                        styles.categoryText,
                                        category === cat._id && { color: theme.colors.primary, fontWeight: 'bold' },
                                    ]}
                                >
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Location */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Location</Text>
                    <TextInput
                        label="City / Municipality"
                        value={location}
                        onChangeText={setLocation}
                        mode="outlined"
                        style={styles.input}
                        placeholder="e.g. Quezon City"
                        outlineStyle={{ borderRadius: 12 }}
                    />
                </View>

                {/* Error */}
                {error && (
                    <HelperText type="error" visible={true} style={styles.error}>
                        {error}
                    </HelperText>
                )}

                {/* Submit Button */}
                <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={loading}
                    style={styles.submitButton}
                    contentStyle={styles.submitButtonContent}
                >
                    List Product
                </Button>

                {/* Spacer for tab bar */}
                <View style={{ height: 0 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    header: {
        marginBottom: 24,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: '#1E293B',
    },
    headerSubtitle: {
        color: '#64748B',
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 12,
    },
    photoPlaceholder: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    addImageButton: {
        width: 100,
        height: 100,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    photoHint: {
        color: '#94A3B8',
        fontStyle: 'italic',
    },
    input: {
        marginBottom: 12,
        backgroundColor: 'white',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfInput: {
        flex: 1,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    categoryButton: {
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 20,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    categoryText: {
        color: '#64748B',
        fontSize: 15,
    },
    error: {
        marginBottom: 8,
    },
    submitButton: {
        borderRadius: 12,
        marginTop: 8,
    },
    submitButtonContent: {
        paddingVertical: 8,
    },
    photoList: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    photoWrapper: {
        position: 'relative',
        marginRight: 10,
    },
    photoThumbnail: {
        width: 100,
        height: 100,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    removePhotoBtn: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#EF4444',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
