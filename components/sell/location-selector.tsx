import { LucideMapPin } from 'lucide-react-native';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface PSGCLocation {
    code: string;
    name: string;
}

interface LocationSelectorProps {
    selectedProvince: PSGCLocation | null;
    selectedCity: PSGCLocation | null;
    onSelectProvince: () => void;
    onSelectCity: () => void;
    disabled?: boolean;
}

export function LocationSelector({
    selectedProvince,
    selectedCity,
    onSelectProvince,
    onSelectCity,
    disabled = false,
}: LocationSelectorProps) {
    const theme = useTheme();

    return (
        <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Location</Text>

            <TouchableOpacity
                style={[
                    styles.selectorButton,
                    !selectedProvince && { borderColor: '#CBD5E1' },
                ]}
                onPress={onSelectProvince}
            >
                <View style={styles.selectorMain}>
                    <LucideMapPin
                        size={20}
                        color={selectedProvince ? theme.colors.primary : '#64748B'}
                    />
                    <View style={styles.selectorTextContent}>
                        <Text style={styles.selectorLabel}>Province</Text>
                        <Text
                            style={[
                                styles.selectorValue,
                                !selectedProvince && { color: '#94A3B8' },
                            ]}
                        >
                            {selectedProvince?.name || 'Select Province'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.selectorButton,
                    !selectedCity && { borderColor: '#CBD5E1' },
                    disabled && { opacity: 0.5 },
                ]}
                disabled={disabled}
                onPress={onSelectCity}
            >
                <View style={styles.selectorMain}>
                    <LucideMapPin
                        size={20}
                        color={selectedCity ? theme.colors.primary : '#64748B'}
                    />
                    <View style={styles.selectorTextContent}>
                        <Text style={styles.selectorLabel}>City / Municipality</Text>
                        <Text
                            style={[
                                styles.selectorValue,
                                !selectedCity && { color: '#94A3B8' },
                            ]}
                        >
                            {selectedCity?.name || 'Select City / Municipality'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 12,
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
});