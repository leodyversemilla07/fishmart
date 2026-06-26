import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { LucideCamera, LucideX } from 'lucide-react-native';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { pickImage } from '@/utils/upload';

interface ImagePickerSectionProps {
    images: ImagePicker.ImagePickerAsset[];
    onImagesChange: (images: ImagePicker.ImagePickerAsset[]) => void;
}

export function ImagePickerSection({
    images,
    onImagesChange,
}: ImagePickerSectionProps) {
    const theme = useTheme();

    const handlePickImages = async () => {
        try {
            const result = await pickImage(true);
            if (result && !result.assets) return;
            if (result?.assets) {
                onImagesChange([...images, ...result.assets]);
            }
        } catch (error) {
            console.error('Failed to pick image:', error);
        }
    };

    const removeImage = (index: number) => {
        onImagesChange(images.filter((_, i) => i !== index));
    };

    return (
        <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Photos</Text>
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
                    <View key={img.uri || index} style={styles.photoWrapper}>
                        <ExpoImage
                            source={{ uri: img.uri }}
                            style={styles.photoThumbnail}
                            contentFit="cover"
                        />
                        <TouchableOpacity
                            style={styles.removePhotoBtn}
                            onPress={() => removeImage(index)}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Remove photo"
                        >
                            <LucideX size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
            <Text variant="bodySmall" style={styles.hint}>
                Add up to 5 photos. First photo will be the cover.
            </Text>
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
    photoWrapper: {
        position: 'relative',
        marginRight: 16,
        paddingTop: 8,
        paddingRight: 8,
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
        borderRadius: 22,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        elevation: 5,
        borderWidth: 2,
        borderColor: 'white',
    },
    hint: {
        color: '#94A3B8',
        fontStyle: 'italic',
        marginTop: 8,
    },
});