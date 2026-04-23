import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/authStore';
import { Category } from '@/types';
import { pickImage, uploadImage } from '@/utils/upload';
import { useMutation, useQuery } from 'convex/react';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { LucideCamera, LucideChevronRight, LucideMapPin, LucideSearch, LucideX } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, ActivityIndicator as RNActivityIndicator, TextInput as RNTextInput, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PSGCLocation {
    code: string;
    name: string;
}

function isPSGCLocation(value: unknown): value is PSGCLocation {
    return typeof value === 'object'
        && value !== null
        && 'code' in value
        && 'name' in value
        && typeof value.code === 'string'
        && typeof value.name === 'string';
}

function parsePSGCLocations(value: unknown): PSGCLocation[] {
    return Array.isArray(value) ? value.filter(isPSGCLocation) : [];
}

export default function SellScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { isAuthenticated, sessionToken } = useAuthStore();

    // Convex Hooks
    const categories = useQuery(api.categories.list) || [];
    const createProduct = useMutation(api.products.create);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('1');
    const [category, setCategory] = useState<Id<"categories"> | ''>('');

    // Image state
    const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Location State
    const [provinces, setProvinces] = useState<PSGCLocation[]>([]);
    const [cities, setCities] = useState<PSGCLocation[]>([]);
    const [selectedProvince, setSelectedProvince] = useState<PSGCLocation | null>(null);
    const [selectedCity, setSelectedCity] = useState<PSGCLocation | null>(null);
    const [locationModalVisible, setLocationModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'province' | 'city'>('province');
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingLocations, setLoadingLocations] = useState(false);

    useEffect(() => {
        fetchProvinces();
    }, []);

    const fetchProvinces = async () => {
        try {
            setLoadingLocations(true);
            const response = await fetch('https://psgc.gitlab.io/api/provinces/');
            const data = parsePSGCLocations(await response.json());
            // Sort alphabetically
            const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
            setProvinces(sorted);
        } catch (err) {
            console.error('Failed to fetch provinces:', err);
        } finally {
            setLoadingLocations(false);
        }
    };

    const fetchCities = async (provinceCode: string) => {
        try {
            setLoadingLocations(true);
            const response = await fetch(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`);
            const data = parsePSGCLocations(await response.json());
            const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
            setCities(sorted);
        } catch (err) {
            console.error('Failed to fetch cities:', err);
        } finally {
            setLoadingLocations(false);
        }
    };

    const handleSelectProvince = (province: PSGCLocation) => {
        setSelectedProvince(province);
        setSelectedCity(null);
        setCities([]);
        fetchCities(province.code);
        setLocationModalVisible(false);
        setSearchQuery('');
    };

    const handleSelectCity = (city: PSGCLocation) => {
        setSelectedCity(city);
        setLocationModalVisible(false);
        setSearchQuery('');
    };

    const filteredLocations = (modalType === 'province' ? provinces : cities).filter(loc =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
        if (!selectedProvince) {
            setError('Please select a province');
            return;
        }
        if (!selectedCity) {
            setError('Please select a city or municipality');
            return;
        }
        if (!isAuthenticated || !sessionToken) {
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
                const url = await uploadImage(img.uri, img.base64, 'products', 'listings');
                uploadedUrls.push(url);
            }

            // Call Convex mutation
            await createProduct({
                sessionToken,
                name: name.trim(),
                description: description.trim(),
                price: parseFloat(price),
                stock: parseInt(stock) || 1,
                categoryId: category,
                city: selectedCity.name,
                province: selectedProvince.name,
                images: uploadedUrls,
            });

            Alert.alert(
                'Success',
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
                            setSelectedProvince(null);
                            setSelectedCity(null);
                            setImages([]);
                            router.push('/(tabs)/explore');
                        },
                    },
                ]
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to list product';
            setError(message);
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
                            <View style={styles.photoWrapper}>
                                <TouchableOpacity
                                    style={[styles.addImageButton, { borderColor: theme.colors.primary }]}
                                    onPress={handlePickImages}
                                >
                                    <LucideCamera size={32} color={theme.colors.primary} />
                                    <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                                        Add
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {images.map((img, index) => (
                                <View key={index} style={styles.photoWrapper}>
                                    <ExpoImage source={{ uri: img.uri }} style={styles.photoThumbnail} />
                                    <TouchableOpacity
                                        style={styles.removePhotoBtn}
                                        onPress={() => removeImage(index)}
                                        activeOpacity={0.8}
                                    >
                                        <LucideX size={14} color="white" />
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

                    <TouchableOpacity
                        style={[styles.selectorButton, !selectedProvince && { borderColor: '#CBD5E1' }]}
                        onPress={() => {
                            setModalType('province');
                            setLocationModalVisible(true);
                        }}
                    >
                        <View style={styles.selectorMain}>
                            <LucideMapPin size={20} color={selectedProvince ? theme.colors.primary : '#64748B'} />
                            <View style={styles.selectorTextContent}>
                                <Text style={styles.selectorLabel}>Province</Text>
                                <Text style={[styles.selectorValue, !selectedProvince && { color: '#94A3B8' }]}>
                                    {selectedProvince ? selectedProvince.name : 'Select Province'}
                                </Text>
                            </View>
                        </View>
                        <LucideChevronRight size={20} color="#94A3B8" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.selectorButton,
                            !selectedCity && { borderColor: '#CBD5E1' },
                            !selectedProvince && { opacity: 0.5 }
                        ]}
                        disabled={!selectedProvince}
                        onPress={() => {
                            setModalType('city');
                            setLocationModalVisible(true);
                        }}
                    >
                        <View style={styles.selectorMain}>
                            <LucideMapPin size={20} color={selectedCity ? theme.colors.primary : '#64748B'} />
                            <View style={styles.selectorTextContent}>
                                <Text style={styles.selectorLabel}>City / Municipality</Text>
                                <Text style={[styles.selectorValue, !selectedCity && { color: '#94A3B8' }]}>
                                    {selectedCity ? selectedCity.name : 'Select City / Municipality'}
                                </Text>
                            </View>
                        </View>
                        <LucideChevronRight size={20} color="#94A3B8" />
                    </TouchableOpacity>
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

            {/* Location Selector Modal */}
            <Modal visible={locationModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text variant="titleLarge" style={styles.modalTitle}>
                                Select {modalType === 'province' ? 'Province' : 'City'}
                            </Text>
                            <TouchableOpacity onPress={() => {
                                setLocationModalVisible(false);
                                setSearchQuery('');
                            }}>
                                <LucideX size={24} color="#1E293B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalSearchContainer}>
                            <LucideSearch size={20} color="#64748B" />
                            <RNTextInput
                                placeholder={`Search ${modalType}...`}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                style={styles.modalSearchInput}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        {loadingLocations ? (
                            <View style={styles.modalLoading}>
                                <RNActivityIndicator size="large" color={theme.colors.primary} />
                            </View>
                        ) : (
                            <FlatList
                                data={filteredLocations}
                                keyExtractor={(item) => item.code}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.locationItem}
                                        onPress={() => modalType === 'province' ? handleSelectProvince(item) : handleSelectCity(item)}
                                    >
                                        <Text style={styles.locationItemText}>{item.name}</Text>
                                        {(modalType === 'province' ? selectedProvince?.code : selectedCity?.code) === item.code && (
                                            <View style={[styles.selectedDot, { backgroundColor: theme.colors.primary }]} />
                                        )}
                                    </TouchableOpacity>
                                )}
                                contentContainerStyle={styles.modalList}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Text>No results found</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>
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
        paddingBottom: 40,
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
        alignItems: 'flex-start',
    },
    photoWrapper: {
        position: 'relative',
        marginRight: 16,
        paddingTop: 8,
        paddingRight: 8,
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
        top: 0,
        right: 0,
        backgroundColor: '#EF4444',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        elevation: 5,
        borderWidth: 2,
        borderColor: 'white',
    },
    selectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 12,
        minHeight: 64,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    selectorMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    selectorTextContent: {
        flex: 1,
        justifyContent: 'center',
    },
    selectorLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    selectorValue: {
        fontSize: 16,
        color: '#1E293B',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        width: '100%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalTitle: {
        fontWeight: 'bold',
        color: '#1E293B',
    },
    modalSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F1F5F9',
        margin: 16,
        borderRadius: 12,
        gap: 12,
    },
    modalSearchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1E293B',
        padding: 0,
        height: 24,
    },
    modalList: {
        paddingBottom: 40,
    },
    locationItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    locationItemText: {
        fontSize: 16,
        color: '#1E293B',
    },
    selectedDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    modalLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
});
