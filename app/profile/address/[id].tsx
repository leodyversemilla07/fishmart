import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/authStore';
import { Address } from '@/types';
import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { LucideArrowLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Checkbox, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AddressFormScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { convexUser } = useAuthStore();

    const isEditing = id && id !== 'new';

    const address = useQuery(api.users.getAddress, { id: id || 'new' }) as Address | null;
    const createAddressMutation = useMutation(api.users.addAddress);
    const updateAddressMutation = useMutation(api.users.updateAddress);

    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [streetAddress, setStreetAddress] = useState('');
    const [barangay, setBarangay] = useState('');
    const [city, setCity] = useState('');
    const [province, setProvince] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [isDefault, setIsDefault] = useState(false);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (address) {
            setFullName(address.fullName || '');
            setPhoneNumber(address.phoneNumber || '');
            setStreetAddress(address.streetAddress || '');
            setBarangay(address.barangay || '');
            setCity(address.city || '');
            setProvince(address.province || '');
            setPostalCode(address.postalCode || '');
            setIsDefault(address.isDefault || false);
        }
    }, [address]);

    const handleSubmit = async () => {
        if (!fullName.trim() || !phoneNumber.trim() || !streetAddress.trim() || !barangay.trim() || !city.trim() || !province.trim()) {
            setError('Please fill in all required fields');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            if (!convexUser) {
                setError('You must be logged in');
                return;
            }

            const addressData = {
                userId: convexUser._id as Id<"users">,
                fullName: fullName.trim(),
                phoneNumber: phoneNumber.trim(),
                streetAddress: streetAddress.trim(),
                barangay: barangay.trim(),
                city: city.trim(),
                province: province.trim(),
                postalCode: postalCode.trim() || undefined,
                isDefault,
            };

            if (isEditing) {
                // Remove userId from update payload
                const { userId, ...updateData } = addressData;
                await updateAddressMutation({
                    id: id as Id<"addresses">,
                    ...updateData
                });
            } else {
                await createAddressMutation(addressData);
            }

            Alert.alert(
                'Success!',
                isEditing ? 'Address updated successfully!' : 'Address added successfully!',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (err: any) {
            setError(err.message || 'Failed to save address');
        } finally {
            setSaving(false);
        }
    };

    if (isEditing && address === undefined) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.elevation.level2 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <LucideArrowLeft size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text variant="titleLarge" style={styles.headerTitle}>
                    {isEditing ? 'Edit Address' : 'Add Address'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Contact Information</Text>
                    <TextInput label="Full Name" value={fullName} onChangeText={setFullName} mode="outlined" style={styles.input} outlineStyle={{ borderRadius: 12 }} />
                    <TextInput label="Phone Number" value={phoneNumber} onChangeText={setPhoneNumber} mode="outlined" style={styles.input} keyboardType="phone-pad" outlineStyle={{ borderRadius: 12 }} />
                </View>

                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Address Details</Text>
                    <TextInput label="Street Address" value={streetAddress} onChangeText={setStreetAddress} mode="outlined" style={styles.input} outlineStyle={{ borderRadius: 12 }} multiline />
                    <TextInput label="Barangay" value={barangay} onChangeText={setBarangay} mode="outlined" style={styles.input} outlineStyle={{ borderRadius: 12 }} />
                    <View style={styles.row}>
                        <TextInput label="City / Municipality" value={city} onChangeText={setCity} mode="outlined" style={[styles.input, styles.halfInput]} outlineStyle={{ borderRadius: 12 }} />
                        <TextInput label="Province" value={province} onChangeText={setProvince} mode="outlined" style={[styles.input, styles.halfInput]} outlineStyle={{ borderRadius: 12 }} />
                    </View>
                    <TextInput label="Postal Code (Optional)" value={postalCode} onChangeText={setPostalCode} mode="outlined" style={styles.input} keyboardType="numeric" outlineStyle={{ borderRadius: 12 }} />
                </View>

                <TouchableOpacity style={styles.checkboxRow} onPress={() => setIsDefault(!isDefault)} activeOpacity={0.7}>
                    <Checkbox status={isDefault ? 'checked' : 'unchecked'} onPress={() => setIsDefault(!isDefault)} color={theme.colors.primary} />
                    <Text variant="bodyMedium" style={styles.checkboxLabel}>Set as default address</Text>
                </TouchableOpacity>

                {error && <HelperText type="error" visible={true} style={styles.error}>{error}</HelperText>}

                <Button mode="contained" onPress={handleSubmit} loading={saving} disabled={saving} style={styles.submitButton} contentStyle={styles.submitButtonContent}>
                    {isEditing ? 'Save Changes' : 'Add Address'}
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
    input: { marginBottom: 12, backgroundColor: 'white' },
    row: { flexDirection: 'row', gap: 12 },
    halfInput: { flex: 1 },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    checkboxLabel: { color: '#1E293B' },
    error: { marginBottom: 8 },
    submitButton: { borderRadius: 12, marginTop: 8 },
    submitButtonContent: { paddingVertical: 8 },
});
