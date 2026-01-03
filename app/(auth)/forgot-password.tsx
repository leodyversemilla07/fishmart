import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <ImageBackground
                source={require('@/assets/images/hero.png')}
                style={styles.backgroundImage}
                imageStyle={{ opacity: 0.6 }}
            >
                <View style={styles.overlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.flex}
                    >
                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                            <View style={styles.header}>
                                <Image
                                    source={require('@/assets/images/logo.png')}
                                    style={styles.logo as any}
                                    contentFit="contain"
                                />

                                <Text variant="headlineMedium" style={styles.title}>Reset Password</Text>
                                <Text variant="bodyLarge" style={styles.subtitle}>
                                    Self-service password reset is currently unavailable.
                                </Text>
                            </View>

                            <View style={styles.form}>
                                <View style={styles.successContainer}>
                                    <Text variant="headlineSmall" style={styles.successTitle}>
                                        Contact Support 📞
                                    </Text>
                                    <Text variant="bodyMedium" style={styles.successText}>
                                        Please contact support at support@fishmart.ph to reset your password.
                                    </Text>
                                    <Button
                                        mode="contained"
                                        onPress={() => router.back()}
                                        style={styles.backButton}
                                        contentStyle={styles.buttonContent}
                                    >
                                        Back to Login
                                    </Button>
                                </View>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    backgroundImage: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: 24,
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 200,
        height: 80,
        marginBottom: 20,
    },
    title: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    subtitle: {
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        marginTop: 8,
    },
    form: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: 24,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    successContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    successTitle: {
        color: '#2E7D32',
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    successText: {
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    backButton: {
        borderRadius: 12,
        marginTop: 8,
    },
    buttonContent: {
        paddingVertical: 8,
    },
});
