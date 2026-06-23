import { LucideSearch, LucideX } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    TextInput as RNTextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface PSGCLocation {
    code: string;
    name: string;
}

interface LocationModalProps {
    visible: boolean;
    type: 'province' | 'city';
    selectedCode?: string;
    onSelect: (location: PSGCLocation) => void;
    onClose: () => void;
}

export function LocationModal({
    visible,
    type,
    selectedCode,
    onSelect,
    onClose,
}: LocationModalProps) {
    const theme = useTheme();

    const [locations, setLocations] = useState<PSGCLocation[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!visible || type !== 'province') return;
        fetchProvinces();
    }, [visible, type]);

    useEffect(() => {
        if (!visible || type !== 'city' || !selectedCode) return;
        fetchCities(selectedCode);
    }, [visible, type, selectedCode]);

    const fetchProvinces = async () => {
        try {
            setLoading(true);
            const response = await fetch('https://psgc.gitlab.io/api/provinces/');
            const data: PSGCLocation[] = await response.json();
            const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
            setLocations(sorted);
        } catch (err) {
            console.error('Failed to fetch provinces:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCities = async (provinceCode: string) => {
        try {
            setLoading(true);
            const response = await fetch(
                `https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`
            );
            const data: PSGCLocation[] = await response.json();
            const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
            setLocations(sorted);
        } catch (err) {
            console.error('Failed to fetch cities:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredLocations = locations.filter((loc) =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleClose = () => {
        setSearchQuery('');
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text variant="titleLarge" style={styles.title}>
                            Select {type === 'province' ? 'Province' : 'City'}
                        </Text>
                        <TouchableOpacity onPress={handleClose}>
                            <LucideX size={24} color="#1E293B" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchContainer}>
                        <LucideSearch size={20} color="#64748B" />
                        <RNTextInput
                            placeholder={`Search ${type}...`}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={styles.searchInput}
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    {loading ? (
                        <View style={styles.loading}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredLocations}
                            keyExtractor={(item) => item.code}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.locationItem}
                                    onPress={() => onSelect(item)}
                                >
                                    <Text style={styles.locationText}>{item.name}</Text>
                                    {selectedCode === item.code && (
                                        <View
                                            style={[
                                                styles.selectedDot,
                                                { backgroundColor: theme.colors.primary },
                                            ]}
                                        />
                                    )}
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={styles.list}
                            ListEmptyComponent={
                                <View style={styles.empty}>
                                    <Text>No results found</Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    title: {
        fontWeight: 'bold',
        color: '#1E293B',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F1F5F9',
        margin: 16,
        borderRadius: 12,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1E293B',
        padding: 0,
        height: 24,
    },
    list: {
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
    locationText: {
        fontSize: 16,
        color: '#1E293B',
    },
    selectedDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: {
        padding: 40,
        alignItems: 'center',
    },
});