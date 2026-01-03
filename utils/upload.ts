import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import * as ImagePicker from 'expo-image-picker';

// Initialize a simple HTTP client for uploads if needed, 
// OR we can use the fetch API directly with the URL we get.
// We'll use the URL directly.

// We need the convex URL. It's usually in .env.local as EXPO_PUBLIC_CONVEX_URL
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL || 'https://marvelous-wombat-394.convex.cloud'; // Fallback to provided URL if active
const convex = new ConvexHttpClient(convexUrl);

export const pickImage = async (allowsMultiple = false, aspect: [number, number] = [1, 1]) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
        throw new Error('Permission to access media library was denied');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: !allowsMultiple,
        aspect: !allowsMultiple ? aspect : undefined,
        quality: 0.7,
        base64: true, // We might need this for some things, but ideally we upload binary
        allowsMultipleSelection: allowsMultiple,
        // We will read the URI and fetch it to get a blob
    });

    return result;
};

export const uploadImage = async (uri: string, base64: string | undefined | null, bucket: string, path: string): Promise<string> => {
    try {
        // 1. Get Upload URL
        const uploadUrl = await convex.mutation(api.upload.generateUploadUrl);

        // 2. Upload File
        // React Native fetch supports `uri` in body for file uploads if wrapped in FormData, 
        // OR we can convert base64 to blob.
        // The easiest way with Expo is often to fetch the URI to get a blob, then upload that.

        const response = await fetch(uri);
        const blob = await response.blob();

        const result = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "Content-Type": blob.type || "image/jpeg"
            },
            body: blob,
        });

        if (!result.ok) {
            throw new Error(`Upload failed: ${result.statusText}`);
        }

        const { storageId } = await result.json();

        // For now, return the storageId. 
        // NOTE: The UI expects a URL. We will fix the UI to handle this, 
        // OR we can return a temporary serving URL if we had one, but storageId is persistent.
        return storageId;

    } catch (error) {
        console.error('Error uploading image to Convex:', error);
        throw error;
    }
};
