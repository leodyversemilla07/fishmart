import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { LucideArrowLeft, LucideCreditCard, LucideMapPin, LucideTruck } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, RadioButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CheckoutScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { items, totalPrice, clearCart } = useCartStore();
    const { user, convexUser } = useAuthStore();

    // Convex Hooks
    const profile = useQuery(api.users.getProfileById, user ? { userId: user._id as any } : "skip");
    const createOrder = useMutation(api.orders.create);

    const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('COD'); // Default to COD
    const [submitting, setSubmitting] = useState(false);

    // Effect to select default address
    React.useEffect(() => {
        if (profile?.addresses && !selectedAddress) {
            const defaultAddress = profile.addresses.find((a: any) => a.isDefault) || profile.addresses[0];
            if (defaultAddress) {
                setSelectedAddress(defaultAddress._id);
            }
        }
    }, [profile]);

    const shippingFee = 50; // Flat fee for demo
    const total = totalPrice() + shippingFee;

    const handlePlaceOrder = async () => {
        if (!selectedAddress) {
            Alert.alert('Error', 'Please select or add a delivery address.');
            return;
        }

        if (!convexUser?._id) {
            Alert.alert('Error', 'User ID not found. Please re-login.');
            return;
        }

        setSubmitting(true);
        try {
            const orderItems = items.map(item => ({
                productId: item.id as any,
                quantity: item.quantity,
                price: item.price,
                productName: item.name,
                productImage: item.imageUrl
            }));

            await createOrder({
                buyerId: convexUser._id as any,
                addressId: selectedAddress as any,
                paymentMethod: paymentMethod as any,
                items: orderItems,
                shippingFee: shippingFee,
                subtotal: totalPrice(),
                total: total,
                buyerNotes: "Standard delivery"
            });

            clearCart();
            Alert.alert(
                'Success',
                'Your order has been placed successfully!',
                [{ text: 'OK', onPress: () => router.push('/(tabs)') }]
            );
        } catch (error) {
            console.error('Error placing order:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (profile === undefined) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <LucideArrowLeft size={24} color="black" />
                </TouchableOpacity>
                <Text variant="titleLarge" style={styles.headerTitle}>Checkout</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
                {/* Shipping Address */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <LucideMapPin size={20} color={theme.colors.primary} />
                        <Text variant="titleMedium" style={styles.sectionTitle}>Delivery Address</Text>
                    </View>

                    {profile?.addresses && profile.addresses.length > 0 ? (
                        profile.addresses.map((addr: any) => (
                            <TouchableOpacity
                                key={addr._id}
                                style={[
                                    styles.addressCard,
                                    selectedAddress === addr._id && { borderColor: theme.colors.primary, borderWidth: 2 }
                                ]}
                                onPress={() => setSelectedAddress(addr._id)}
                            >
                                <View style={styles.addressInfo}>
                                    <Text variant="titleSmall">{`${addr.firstName} ${addr.lastName}`}</Text>
                                    <Text variant="bodySmall" style={styles.addressText}>
                                        {addr.streetAddress}, {addr.barangay}, {addr.city}, {addr.province}
                                    </Text>
                                    <Text variant="bodySmall">{addr.phoneNumber}</Text>
                                </View>
                                <RadioButton
                                    value={addr._id}
                                    status={selectedAddress === addr._id ? 'checked' : 'unchecked'}
                                    onPress={() => setSelectedAddress(addr._id)}
                                />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Card style={styles.emptyAddressCard}>
                            <Card.Content>
                                <Text variant="bodyMedium">No address found. Please add one in your profile.</Text>
                                <Button
                                    mode="outlined"
                                    style={{ marginTop: 10 }}
                                    onPress={() => router.push('/profile/address' as any)}
                                >
                                    Add New Address
                                </Button>
                            </Card.Content>
                        </Card>
                    )}
                </View>

                {/* Payment Method */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <LucideCreditCard size={20} color={theme.colors.primary} />
                        <Text variant="titleMedium" style={styles.sectionTitle}>Payment Method</Text>
                    </View>

                    <RadioButton.Group onValueChange={value => setPaymentMethod(value)} value={paymentMethod}>
                        <View style={styles.paymentOption}>
                            <RadioButton value="COD" />
                            <Text>Cash on Delivery</Text>
                        </View>
                        <View style={styles.paymentOption}>
                            <RadioButton value="GCASH" />
                            <Text>GCash</Text>
                        </View>
                        <View style={styles.paymentOption}>
                            <RadioButton value="MAYA" />
                            <Text>Maya</Text>
                        </View>
                    </RadioButton.Group>
                </View>

                {/* Order Summary */}
                <View style={[styles.section, styles.lastSection]}>
                    <View style={styles.sectionHeader}>
                        <LucideTruck size={20} color={theme.colors.primary} />
                        <Text variant="titleMedium" style={styles.sectionTitle}>Order Summary</Text>
                    </View>

                    <View style={styles.summaryRow}>
                        <Text variant="bodyMedium">Subtotal ({items.length} items)</Text>
                        <Text variant="bodyMedium">₱{totalPrice().toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text variant="bodyMedium">Shipping Fee</Text>
                        <Text variant="bodyMedium">₱{shippingFee.toLocaleString()}</Text>
                    </View>
                    <Divider style={styles.totalDivider} />
                    <View style={styles.summaryRow}>
                        <Text variant="titleLarge" style={styles.totalLabel}>Total</Text>
                        <Text variant="titleLarge" style={[styles.totalAmount, { color: theme.colors.primary }]}>
                            ₱{total.toLocaleString()}
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Place Order Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <Button
                    mode="contained"
                    onPress={handlePlaceOrder}
                    loading={submitting}
                    disabled={submitting || !selectedAddress}
                    style={styles.placeOrderButton}
                    contentStyle={styles.placeOrderBtnContent}
                >
                    Place Order
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 15,
        backgroundColor: 'white',
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
        padding: 16,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginLeft: 8,
    },
    addressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    addressInfo: {
        flex: 1,
    },
    addressText: {
        color: '#64748B',
        marginTop: 2,
    },
    emptyAddressCard: {
        backgroundColor: '#FFF1F2',
        borderColor: '#FDA4AF',
        borderWidth: 1,
    },
    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    totalDivider: {
        marginVertical: 12,
        backgroundColor: '#F1F5F9',
    },
    totalLabel: {
        fontWeight: 'bold',
    },
    totalAmount: {
        fontWeight: '900',
    },
    lastSection: {
        marginBottom: 100,
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
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    placeOrderButton: {
        borderRadius: 12,
    },
    placeOrderBtnContent: {
        paddingVertical: 8,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
