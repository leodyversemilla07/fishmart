import { Id } from '@/convex/_generated/dataModel';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Category } from '@/types';

interface CategorySelectorProps {
    categories: Category[];
    selectedCategory: Id<"categories"> | null;
    onSelect: (categoryId: Id<"categories">) => void;
}

export function CategorySelector({
    categories,
    selectedCategory,
    onSelect,
}: CategorySelectorProps) {
    const theme = useTheme();

    return (
        <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                    <TouchableOpacity
                        key={cat._id}
                        style={[
                            styles.categoryButton,
                            selectedCategory === cat._id && {
                                backgroundColor: theme.colors.primaryContainer,
                                borderColor: theme.colors.primary,
                            },
                        ]}
                        onPress={() => onSelect(cat._id)}
                    >
                        <Text
                            variant="bodyMedium"
                            style={[
                                styles.categoryText,
                                selectedCategory === cat._id && {
                                    color: theme.colors.primary,
                                    fontWeight: 'bold',
                                },
                            ]}
                        >
                            {cat.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
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
});