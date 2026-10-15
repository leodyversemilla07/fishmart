import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/authStore';
import { useMutation, useQuery } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    CategorySelector,
    ImagePickerSection,
    LocationModal,
    LocationSelector,
} from '@/components/sell';

interface PSGCLocation {
    code: string;
    name: string;
}

export default function SellScreen() {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { isAuthenticated, sessionToken, user, updateUser } = useAuthStore();

    const categories = useQuery(api.categories.list) || [];
    const createProduct = useMutation(api.products.create);
    const becomeSeller = useMutation(api.users.becomeSeller);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('1');
    const [category, setCategory] = useState<Id<"categories"> | null>(null);
    const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shopName, setShopName] = useState(user?.shopName || '');
    const [shopDescription, setShopDescription] = useState(user?.shopDescription || '');
    const [sellerOnboardingLoading, setSellerOnboardingLoading] = useState(false);

    // Location state
    const [selectedProvince, setSelectedProvince] = useState<PSGCLocation | null>(null);
    const [selectedCity, setSelectedCity] = useState<PSGCLocation | null>(null);
    const [locationModalVisible, setLocationModalVisible] = useState(false);
    const [locationModalType, setLocationModalType] = useState<'province' | 'city'>('province');

    const handleOpenProvinceModal = () => {
        setLocationModalType('province');
        setLocationModalVisible(true);
    };

    const handleOpenCityModal = () => {
        if (!selectedProvince) return;
        setLocationModalType('city');
        setLocationModalVisible(true);
    };

    const handleSelectLocation = (location: PSGCLocation) => {
        if (locationModalType === 'province') {
            setSelectedProvince(location);
            setSelectedCity(null);
        } else {
            setSelectedCity(location);
        }
        setLocationModalVisible(false);
    };

    const validateForm = (): boolean => {
        if (!name.trim()) {
            setError('Please enter a product name');
            return false;
        }
        if (!description.trim()) {
            setError('Please enter a description');
            return false;
        }
        if (!price) {
            setError('Please enter a valid price');
            return false;
        }
        const parsedPrice = Number.parseFloat(price);
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            setError('Please enter a valid price');
            return false;
        }
        if (!category) {
            setError('Please select a category');
            return false;
        }
        if (!selectedProvince) {
            setError('Please select a province');
            return false;
        }
        if (!selectedCity) {
            setError('Please select a city or municipality');
            return false;
        }
        return true;
    };

    const handleBecomeSeller = async () => {
        if (!sessionToken) {
            Alert.alert('Login Required', 'Please login to start selling', [
                { text: 'Login', onPress: () => router.push('/(auth)/login') },
                { text: 'Cancel', style: 'cancel' },
            ]);
            return;
        }

        if (!shopName.trim()) {
            setError('Please enter a shop name');
            return;
        }

        setSellerOnboardingLoading(true);
        setError(null);

        try {
            const upgradedUser = await becomeSeller({
                sessionToken,
                shopName: shopName.trim(),
                shopDescription: shopDescription.trim() || undefined,
            });
            updateUser(upgradedUser);
            Alert.alert('Seller account ready', 'You can now list products on Fishmart.');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to set up seller account';
            setError(message);
        } finally {
            setSellerOnboardingLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!isAuthenticated || !sessionToken) {
            Alert.alert('Login Required', 'Please login to list a product', [
                { text: 'Login', onPress: () => router.push('/(auth)/login') },
                { text: 'Cancel', style: 'cancel' },
            ]);
            return;
        }

        if (!validateForm()) return;

        setLoading(true);
        setError(null);

        try {
            const { uploadImage } = await import('@/utils/upload');
            const uploadedUrls: string[] = [];

            for (const img of images) {
                const url = await uploadImage(img.uri, img.base64, 'products', 'listings', sessionToken);
                uploadedUrls.push(url);
            }

            const parsedPrice = Number.parseFloat(price);
            const parsedStock = Number.parseInt(stock, 10);
            const stockValue = Number.isFinite(parsedStock) && parsedStock >= 0 ? parsedStock : 1;

            await createProduct({
                sessionToken,
                name: name.trim(),
                description: description.trim(),
                price: parsedPrice,
                stock: stockValue,
                categoryId: category!,
                city: selectedCity!.name,
                province: selectedProvince!.name,
                images: uploadedUrls,
            });

            Alert.alert('Success', 'Your product has been listed successfully!', [
                {
                    text: 'OK',
                    onPress: () => {
                        setName('');
                        setDescription('');
                        setPrice('');
                        setStock('1');
                        setCategory(null);
                        setSelectedProvince(null);
                        setSelectedCity(null);
                        setImages([]);
                        router.push('/(tabs)/explore');
                    },
                },
            ]);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to list product';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}> 
                <View style={styles.centeredContent}>
                    <Card style={styles.promptCard}>
                        <Card.Content>
                            <Text variant="headlineSmall" style={styles.promptTitle}>Start selling on Fishmart</Text>
                            <Text variant="bodyMedium" style={styles.promptText}>
                                Sign in to create listings, manage orders, and chat with buyers.
                            </Text>
                            <Button
                                mode="contained"
                                onPress={() => router.push('/(auth)/login')}
                                style={styles.promptButton}
                                contentStyle={styles.submitButtonContent}
                            >
                                Sign In
                            </Button>
                        </Card.Content>
                    </Card>
                </View>
            </View>
        );
    }

    if (user?.role === 'BUYER') {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}> 
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <Text variant="headlineMedium" style={styles.headerTitle}>
                            Become a Seller
                        </Text>
                        <Text variant="bodyMedium" style={styles.headerSubtitle}>
                            Set up your shop before listing aquatic pets.
                        </Text>
                    </View>

                    <Card style={styles.onboardingCard}>
                        <Card.Content>
                            <Text variant="titleMedium" style={styles.sectionTitle}>Shop Details</Text>
                            <TextInput
                                label="Shop Name"
                                value={shopName}
                                onChangeText={setShopName}
                                mode="outlined"
                                style={styles.input}
                                placeholder="e.g. Manila Guppy House"
                                outlineStyle={{ borderRadius: 12 }}
                            />
                            <TextInput
                                label="Shop Description (Optional)"
                                value={shopDescription}
                                onChangeText={setShopDescription}
                                mode="outlined"
                                style={styles.input}
                                placeholder="Tell buyers what you breed or sell..."
                                multiline
                                numberOfLines={4}
                                outlineStyle={{ borderRadius: 12 }}
                            />

                            {error && (
                                <HelperText type="error" visible style={styles.error}>
                                    {error}
                                </HelperText>
                            )}

                            <Button
                                mode="contained"
                                onPress={handleBecomeSeller}
                                loading={sellerOnboardingLoading}
                                disabled={sellerOnboardingLoading}
                                style={styles.submitButton}
                                contentStyle={styles.submitButtonContent}
                            >
                                Create Seller Account
                            </Button>
                            <Text variant="bodySmall" style={[styles.sellerNote, { color: theme.colors.onSurfaceVariant }]}>
                                You can update your shop profile later from your account settings.
                            </Text>
                        </Card.Content>
                    </Card>
                </ScrollView>
            </View>
        );
    }

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

                {/* Photo Section */}
                <ImagePickerSection images={images} onImagesChange={setImages} />

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
                <CategorySelector
                    categories={categories}
                    selectedCategory={category}
                    onSelect={setCategory}
                />

                {/* Location */}
                <LocationSelector
                    selectedProvince={selectedProvince}
                    selectedCity={selectedCity}
                    onSelectProvince={handleOpenProvinceModal}
                    onSelectCity={handleOpenCityModal}
                    disabled={!selectedProvince}
                />

                {/* Error */}
                {error && (
                    <HelperText type="error" visible style={styles.error}>
                        {error}
                    </HelperText>
                )}

                {/* Submit */}
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

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Location Modal */}
            <LocationModal
                visible={locationModalVisible}
                type={locationModalType}
                selectedCode={locationModalType === 'city' ? selectedProvince?.code : undefined}
                onSelect={handleSelectLocation}
                onClose={() => setLocationModalVisible(false)}
            />
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
    centeredContent: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    promptCard: {
        borderRadius: 18,
        backgroundColor: 'white',
    },
    promptTitle: {
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 8,
    },
    promptText: {
        color: '#64748B',
        lineHeight: 22,
        marginBottom: 16,
    },
    promptButton: {
        borderRadius: 12,
    },
    onboardingCard: {
        borderRadius: 18,
        backgroundColor: 'white',
    },
    sellerNote: {
        marginTop: 12,
        textAlign: 'center',
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
});