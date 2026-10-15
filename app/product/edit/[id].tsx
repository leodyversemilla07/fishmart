import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Category } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { pickImage, uploadImage } from '@/utils/upload';
import { useMutation, useQuery } from 'convex/react';
import { Image as ExpoImage } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { LucideArrowLeft, LucideCamera, LucideX } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ExistingImage {
    id: string;
    imageUrl: string;
    isExisting: true;
}

interface NewImage {
    uri: string;
    base64?: string | null;
    isExisting: false;
}

type ProductImage = ExistingImage | NewImage;

export default function EditProductScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { id: productId } = useLocalSearchParams<{ id: Id<"products"> }>();
    const { sessionToken } = useAuthStore();

    // Convex Query
    const product = useQuery(api.products.get, productId ? { id: productId } : "skip");
    const hydratedProductRef = useRef<Id<"products"> | null>(null);
    const categoriesList = useQuery(api.categories.list) || [];
    const updateProductMutation = useMutation(api.products.update);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('1');
    const [category, setCategory] = useState<Id<"categories"> | ''>('');
    const [city, setCity] = useState('');
    const [province, setProvince] = useState('');

    const [images, setImages] = useState<ProductImage[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (product === undefined) return;
        if (product === null) {
            setLoading(false);
            return;
        }
        // Hydrate the form once per product so live query updates cannot
        // overwrite in-progress edits.
        if (hydratedProductRef.current === product._id) return;
        hydratedProductRef.current = product._id;

        setName(product.name || '');
        setDescription(product.description || '');
        setPrice(product.price?.toString() || '');
        setStock(product.stock?.toString() || '1');
        setCity(product.city || '');
        setProvince(product.province || '');
        setCategory(product.categoryId);

        if (product.images && product.images.length > 0) {
            setImages(product.images.map((img: { _id: string; imageUrl: string }) => ({
                id: img._id,
                imageUrl: img.imageUrl,
                isExisting: true,
            })));
        }
        setLoading(false);
    }, [product]);

    const handlePickImages = async () => {
        try {
            const result = await pickImage(true);
            if (result && !result.canceled && result.assets) {
                const newImages: NewImage[] = result.assets.map((asset: ImagePickerAsset) => ({
                    uri: asset.uri,
                    base64: asset.base64,
                    isExisting: false as const,
                }));
                setImages(prev => [...prev, ...newImages]);
            }
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!name.trim() || !description.trim() || !price || !category || !city.trim() || !province.trim()) {
            setError('Please fill in all required fields');
            return;
        }

        const parsedPrice = Number.parseFloat(price);
        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
            setError('Please enter a valid price');
            return;
        }
        const parsedStock = Number.parseInt(stock, 10);
        const stockValue = Number.isFinite(parsedStock) && parsedStock >= 0 ? parsedStock : 1;

        setSaving(true);
        setError(null);

        try {
            if (!productId) {
                throw new Error('Product not found.');
            }
            if (!sessionToken) {
                throw new Error('Session expired. Please log in again.');
            }
            const finalImageUrls: string[] = [];
            for (const img of images) {
                if (img.isExisting) {
                    finalImageUrls.push(img.imageUrl);
                } else if (img.base64) {
                    const url = await uploadImage(img.uri, img.base64, 'products', 'listings', sessionToken);
                    finalImageUrls.push(url);
                }
            }

            await updateProductMutation({
                sessionToken,
                id: productId,
                name: name.trim(),
                description: description.trim(),
                price: parsedPrice,
                stock: stockValue,
                categoryId: category,
                city: city.trim(),
                province: province.trim(),
                images: finalImageUrls,
            });

            Alert.alert('Success', 'Product updated successfully', [{ text: 'OK', onPress: () => router.back() }]);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update product';
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    if (loading || product === undefined) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (product === null) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <Text variant="titleMedium" style={{ marginBottom: 16, color: '#64748B' }}>
                    This product no longer exists.
                </Text>
                <Button mode="contained" onPress={() => router.back()}>
                    Go Back
                </Button>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.elevation.level2 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <LucideArrowLeft size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text variant="titleLarge" style={styles.headerTitle}>Edit Product</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Photos</Text>
                    <View style={styles.photoList}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <TouchableOpacity style={[styles.addImageButton, { borderColor: theme.colors.primary }]} onPress={handlePickImages}>
                                <LucideCamera size={32} color={theme.colors.primary} />
                                <Text variant="bodySmall" style={{ color: theme.colors.primary }}>Add</Text>
                            </TouchableOpacity>

                            {images.map((img, index) => (
                                <View key={index} style={styles.photoWrapper}>
                                    <ExpoImage source={{ uri: img.isExisting ? img.imageUrl : img.uri }} style={styles.photoThumbnail} />
                                    <TouchableOpacity
                                        style={styles.removePhotoBtn}
                                        onPress={() => removeImage(index)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Remove photo"
                                    >
                                        <LucideX size={18} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Product Details</Text>
                    <TextInput label="Product Name" value={name} onChangeText={setName} mode="outlined" style={styles.input} outlineStyle={{ borderRadius: 12 }} />
                    <TextInput label="Description" value={description} onChangeText={setDescription} mode="outlined" style={styles.input} multiline numberOfLines={4} outlineStyle={{ borderRadius: 12 }} />
                    <View style={styles.row}>
                        <TextInput label="Price (PHP)" value={price} onChangeText={setPrice} mode="outlined" style={[styles.input, styles.halfInput]} keyboardType="numeric" outlineStyle={{ borderRadius: 12 }} />
                        <TextInput label="Stock Quantity" value={stock} onChangeText={setStock} mode="outlined" style={[styles.input, styles.halfInput]} keyboardType="numeric" outlineStyle={{ borderRadius: 12 }} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Category</Text>
                    <View style={styles.categoryGrid}>
                        {Array.isArray(categoriesList) && categoriesList.map((cat: Category) => (
                            <TouchableOpacity
                                key={cat._id}
                                style={[styles.categoryButton, category === cat._id && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }]}
                                onPress={() => setCategory(cat._id)}
                            >
                                <Text variant="bodyMedium" style={[styles.categoryText, category === cat._id && { color: theme.colors.primary, fontWeight: 'bold' }]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Location</Text>
                    <View style={styles.row}>
                        <TextInput label="City / Municipality" value={city} onChangeText={setCity} mode="outlined" style={[styles.input, styles.halfInput]} outlineStyle={{ borderRadius: 12 }} />
                        <TextInput label="Province" value={province} onChangeText={setProvince} mode="outlined" style={[styles.input, styles.halfInput]} outlineStyle={{ borderRadius: 12 }} />
                    </View>
                </View>

                {error && <HelperText type="error" visible={true} style={styles.error}>{error}</HelperText>}

                <Button mode="contained" onPress={handleSubmit} loading={saving} disabled={saving} style={styles.submitButton} contentStyle={styles.submitButtonContent}>
                    Save Changes
                </Button>
                <View style={{ height: insets.bottom + 20 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    loadingContainer: { justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15, elevation: 2 },
    headerTitle: { fontWeight: 'bold', color: '#1E293B' },
    backButton: { padding: 8 },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },
    section: { marginBottom: 24 },
    sectionTitle: { fontWeight: '600', color: '#1E293B', marginBottom: 12 },
    addImageButton: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
    photoList: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    photoWrapper: { position: 'relative', marginLeft: 10 },
    photoThumbnail: { width: 100, height: 100, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    removePhotoBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#EF4444', borderRadius: 22, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    input: { marginBottom: 12, backgroundColor: 'white' },
    row: { flexDirection: 'row', gap: 12 },
    halfInput: { flex: 1 },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    categoryButton: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0' },
    categoryText: { color: '#64748B', fontSize: 15 },
    error: { marginBottom: 8 },
    submitButton: { borderRadius: 12, marginTop: 8 },
    submitButtonContent: { paddingVertical: 8 },
});
