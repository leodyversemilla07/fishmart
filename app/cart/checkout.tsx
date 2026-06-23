import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import type { Address } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useAction, useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { LucideArrowLeft, LucideCreditCard, LucideMapPin, LucideTruck, LucideShield } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, RadioButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Payment method configuration
const PAYMENT_METHODS = [
    { value: 'COD', label: 'Cash on Delivery', description: 'Pay when you receive', requiresOnlinePayment: false },
    { value: 'GCASH', label: 'GCash', description: 'Pay via GCash e-wallet', requiresOnlinePayment: true },
    { value: 'MAYA', label: 'Maya', description: 'Pay via Maya e-wallet', requiresOnlinePayment: true },
    { value: 'CARD', label: 'Credit/Debit Card', description: 'Visa, Mastercard accepted', requiresOnlinePayment: true },
] as const;

type PaymentMethod = typeof PAYMENT_METHODS[number]['value'];

function isPaymentMethod(value: string): value is PaymentMethod {
    return PAYMENT_METHODS.some((method) => method.value === value);
}

export default function CheckoutScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { items, totalPrice, clearCart } = useCartStore();
    const { sessionToken } = useAuthStore();

    // Convex Hooks
    const profile = useQuery(api.users.getProfileById, sessionToken ? { sessionToken } : "skip");
    const createOrder = useMutation(api.orders.create);
    const createCheckoutSession = useAction(api.paymongo.createCheckoutSession);
    const addresses = useMemo(() => profile?.addresses ?? [], [profile?.addresses]);

    const [selectedAddress, setSelectedAddress] = useState<Id<"addresses"> | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
    const [submitting, setSubmitting] = useState(false);

    // Effect to select default address
    React.useEffect(() => {
        if (addresses.length > 0 && !selectedAddress) {
            const defaultAddress = addresses.find((a: Address) => a.isDefault) || addresses[0];
            if (defaultAddress) {
                setSelectedAddress(defaultAddress._id);
            }
        }
    }, [addresses, selectedAddress]);

    const shippingFee = 50; // Flat fee for demo
    const total = totalPrice() + shippingFee;

    const selectedPaymentConfig = PAYMENT_METHODS.find(p => p.value === paymentMethod);

    const handlePlaceOrder = async () => {
        if (!selectedAddress) {
            Alert.alert('Error', 'Please select or add a delivery address.');
            return;
        }

        if (!sessionToken) {
            Alert.alert('Error', 'Session expired. Please re-login.');
            return;
        }

        setSubmitting(true);
        try {
            const orderItems = items.map(item => ({
                productId: item.id,
                quantity: item.quantity,
            }));

            // Create the order first
            const orderResult = await createOrder({
                sessionToken,
                addressId: selectedAddress,
                paymentMethod,
                items: orderItems,
                buyerNotes: "Standard delivery"
            });

            // If online payment is required, create PayMongo checkout session
            if (selectedPaymentConfig?.requiresOnlinePayment) {
                // Generate deep link URLs for redirect
                const successUrl = Linking.createURL('payment-success', { queryParams: { orderId: String(orderResult.orderId) } });
                const cancelUrl = Linking.createURL('payment-cancelled', { queryParams: { orderId: String(orderResult.orderId) } });

                const checkoutResult = await createCheckoutSession({
                    sessionToken,
                    orderId: orderResult.orderId,
                    successUrl,
                    cancelUrl,
                });

                if ('error' in checkoutResult) {
                    Alert.alert('Payment Error', checkoutResult.error);
                    return;
                }

                // Open PayMongo checkout in browser
                const result = await WebBrowser.openBrowserAsync(checkoutResult.checkoutUrl, {
                    dismissButtonStyle: 'cancel',
                    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
                });

                if (result.type === 'cancel') {
                    Alert.alert(
                        'Payment Cancelled',
                        'Your order has been created but payment was not completed. You can complete payment later from your orders.',
                        [{ text: 'View Orders', onPress: () => router.push('/orders') }]
                    );
                } else {
                    // Payment completed or user returned
                    clearCart();
                    Alert.alert(
                        'Order Placed',
                        'Your order has been placed. You will receive a notification once payment is confirmed.',
                        [{ text: 'View Orders', onPress: () => router.push('/orders') }]
                    );
                }
            } else {
                // COD - No online payment needed
                clearCart();
                Alert.alert(
                    'Success',
                    'Your order has been placed successfully! Pay cash when you receive your order.',
                    [{ text: 'View Orders', onPress: () => router.push('/orders') }]
                );
            }
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

                    {addresses.length > 0 ? (
                        addresses.map((addr: Address) => (
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
                                    onPress={() => router.push('/profile/address/new')}
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

                    <RadioButton.Group
                        onValueChange={(value) => {
                            if (isPaymentMethod(value)) {
                                setPaymentMethod(value);
                            }
                        }}
                        value={paymentMethod}
                    >
                        {PAYMENT_METHODS.map((method) => (
                            <TouchableOpacity
                                key={method.value}
                                style={[
                                    styles.paymentCard,
                                    paymentMethod === method.value && { borderColor: theme.colors.primary, borderWidth: 2 }
                                ]}
                                onPress={() => setPaymentMethod(method.value)}
                            >
                                <RadioButton value={method.value} />
                                <View style={styles.paymentInfo}>
                                    <Text variant="titleSmall">{method.label}</Text>
                                    <Text variant="bodySmall" style={styles.paymentDescription}>
                                        {method.description}
                                    </Text>
                                </View>
                                {method.requiresOnlinePayment && (
                                    <LucideShield size={16} color={theme.colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </RadioButton.Group>

                    {selectedPaymentConfig?.requiresOnlinePayment && (
                        <View style={styles.paymentNote}>
                            <LucideShield size={14} color="#10B981" />
                            <Text variant="bodySmall" style={styles.paymentNoteText}>
                                Secure payment powered by PayMongo
                            </Text>
                        </View>
                    )}
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
                    {selectedPaymentConfig?.requiresOnlinePayment ? 'Proceed to Payment' : 'Place Order'}
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
    paymentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    paymentInfo: {
        flex: 1,
        marginLeft: 4,
    },
    paymentDescription: {
        color: '#64748B',
        marginTop: 2,
    },
    paymentNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        padding: 10,
        borderRadius: 8,
        marginTop: 8,
    },
    paymentNoteText: {
        color: '#059669',
        marginLeft: 6,
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
