import { useCartStore, type CartItem } from '@/store/cartStore';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
    LucideArrowLeft,
    LucideMinus,
    LucidePlus,
    LucideShoppingBag,
    LucideTrash2
} from 'lucide-react-native';
import React from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Divider, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CartScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCartStore();

    if (items.length === 0) {
        return (
            <View style={[styles.container, styles.emptyContainer]}>
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <LucideArrowLeft size={24} color="black" />
                    </TouchableOpacity>
                    <Text variant="titleLarge" style={styles.headerTitle}>My Cart</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.emptyContent}>
                    <LucideShoppingBag size={80} color={theme.colors.outline} style={{ opacity: 0.3 }} />
                    <Text variant="headlineSmall" style={styles.emptyText}>Your cart is empty</Text>
                    <Text variant="bodyMedium" style={styles.emptySubtext}>
                        Looks like you haven&apos;t added any aquatic friends to your cart yet.
                    </Text>
                    <Button
                        mode="contained"
                        onPress={() => router.push('/(tabs)/explore')}
                        style={styles.startShoppingButton}
                    >
                        Start Shopping
                    </Button>
                </View>
            </View>
        );
    }

    const renderItem = ({ item }: { item: CartItem }) => (
        <View style={styles.cartItem}>
            <Image
                source={{ uri: item.imageUrl }}
                style={styles.itemImage}
                contentFit="cover"
            />
            <View style={styles.itemInfo}>
                <View style={styles.itemHeader}>
                    <Text variant="titleMedium" numberOfLines={1} style={styles.itemName}>
                        {item.name}
                    </Text>
                    <TouchableOpacity onPress={() => removeItem(item.id)}>
                        <LucideTrash2 size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                </View>

                <Text variant="bodySmall" style={styles.sellerName}>
                    Seller: {item.sellerName}
                </Text>

                <View style={styles.itemFooter}>
                    <Text variant="titleLarge" style={[styles.itemPrice, { color: theme.colors.primary }]}>
                        ₱{item.price.toLocaleString()}
                    </Text>

                    <View style={styles.quantityContainer}>
                        <TouchableOpacity
                            onPress={() => updateQuantity(item.id, item.quantity - 1)}
                            style={styles.quantityBtn}
                        >
                            <LucideMinus size={16} color="black" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                            onPress={() => updateQuantity(item.id, item.quantity + 1)}
                            style={styles.quantityBtn}
                        >
                            <LucidePlus size={16} color="black" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <LucideArrowLeft size={24} color="black" />
                </TouchableOpacity>
                <Text variant="titleLarge" style={styles.headerTitle}>My Cart ({totalItems()})</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ItemSeparatorComponent={() => <Divider style={styles.divider} />}
                contentContainerStyle={styles.listContent}
            />

            {/* Bottom Summary */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.summaryRow}>
                    <Text variant="bodyLarge">Subtotal</Text>
                    <Text variant="titleLarge" style={styles.totalAmount}>
                        ₱{totalPrice().toLocaleString()}
                    </Text>
                </View>
                <Text variant="labelSmall" style={styles.taxNote}>
                    Shipping fees are calculated at checkout.
                </Text>

                <Button
                    mode="contained"
                    style={styles.checkoutButton}
                    contentStyle={styles.checkoutBtnContent}
                    onPress={() => router.push('/cart/checkout')}
                >
                    Proceed to Checkout
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
    listContent: {
        padding: 16,
    },
    cartItem: {
        flexDirection: 'row',
        paddingVertical: 12,
    },
    itemImage: {
        width: 100,
        height: 100,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
    },
    itemInfo: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'space-between',
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    itemName: {
        fontWeight: '700',
        flex: 1,
        marginRight: 8,
    },
    sellerName: {
        color: '#64748B',
        marginTop: 2,
    },
    itemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    itemPrice: {
        fontWeight: 'bold',
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
        padding: 4,
    },
    quantityBtn: {
        padding: 4,
    },
    quantityText: {
        paddingHorizontal: 12,
        fontWeight: 'bold',
    },
    divider: {
        marginVertical: 4,
        backgroundColor: '#F1F5F9',
    },
    footer: {
        backgroundColor: 'white',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    totalAmount: {
        fontWeight: 'bold',
        color: '#1E293B',
    },
    taxNote: {
        color: '#64748B',
        marginBottom: 20,
    },
    checkoutButton: {
        borderRadius: 12,
    },
    checkoutBtnContent: {
        paddingVertical: 8,
    },
    emptyContainer: {
        justifyContent: 'flex-start',
    },
    emptyContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        marginTop: 20,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    emptySubtext: {
        textAlign: 'center',
        color: '#64748B',
        marginTop: 10,
        lineHeight: 22,
    },
    startShoppingButton: {
        marginTop: 30,
        borderRadius: 12,
        paddingHorizontal: 20,
    },
});
