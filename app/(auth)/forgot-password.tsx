import { api } from '@/convex/_generated/api';
import { useAction } from 'convex/react';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';

type Step = 'request' | 'sent' | 'reset' | 'success';

export default function ForgotPasswordScreen() {
    const params = useLocalSearchParams<{ token?: string }>();
    const [step, setStep] = useState<Step>('request');
    const [email, setEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const forgotPasswordAction = useAction(api.auth.forgotPassword);
    const resetPasswordAction = useAction(api.auth.resetPassword);

    useEffect(() => {
        if (params.token) {
            setResetToken(params.token);
            setStep('reset');
        }
    }, [params.token]);

    const handleRequestReset = async () => {
        if (!email) {
            setError('Please enter your email address');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await forgotPasswordAction({ email });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setStep('sent');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            setError(message);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!resetToken || !newPassword) {
            setError('Please enter both the reset token and a new password');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await resetPasswordAction({
                token: resetToken,
                newPassword,
            });

            if ('error' in result) {
                setError(result.error);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setStep('success');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            setError(message);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setLoading(false);
        }
    };

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
                                    style={styles.logo}
                                    contentFit="contain"
                                />
                                <Text variant="headlineMedium" style={styles.title}>Reset Password</Text>
                                <Text variant="bodyLarge" style={styles.subtitle}>
                                    {step === 'request' && 'Enter your email to receive a reset link'}
                                    {step === 'sent' && 'Check your email for the reset link'}
                                    {step === 'reset' && 'Enter the token and your new password'}
                                    {step === 'success' && 'Password has been reset successfully'}
                                </Text>
                            </View>

                            <View style={styles.form}>
                                {step === 'request' && (
                                    <>
                                        <TextInput
                                            label="Email Address"
                                            value={email}
                                            onChangeText={setEmail}
                                            mode="outlined"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            style={styles.input}
                                            left={<TextInput.Icon icon="email" />}
                                            outlineStyle={{ borderRadius: 12 }}
                                        />

                                        {error && <HelperText type="error" visible={true}>{error}</HelperText>}

                                        <Button
                                            mode="contained"
                                            onPress={handleRequestReset}
                                            loading={loading}
                                            disabled={loading}
                                            style={styles.submitButton}
                                            contentStyle={styles.buttonContent}
                                        >
                                            Send Reset Link
                                        </Button>
                                    </>
                                )}

                                {step === 'sent' && (
                                    <>
                                        <View style={styles.successContainer}>
                                            <Text variant="bodyMedium" style={styles.successText}>
                                                If an account with {email} exists, a password reset link has been sent.
                                            </Text>
                                            <Text variant="bodySmall" style={{ color: '#888', textAlign: 'center', marginBottom: 16 }}>
                                                Open the link from your email, or copy the reset token into the app.
                                            </Text>
                                            <Button
                                                mode="contained"
                                                onPress={() => setStep('reset')}
                                                style={styles.submitButton}
                                                contentStyle={styles.buttonContent}
                                            >
                                                I Have a Token
                                            </Button>
                                            <Button
                                                mode="text"
                                                onPress={() => setStep('request')}
                                                style={{ marginTop: 8 }}
                                            >
                                                Try Again
                                            </Button>
                                        </View>
                                    </>
                                )}

                                {step === 'reset' && (
                                    <>
                                        <TextInput
                                            label="Reset Token"
                                            value={resetToken}
                                            onChangeText={setResetToken}
                                            mode="outlined"
                                            autoCapitalize="none"
                                            style={styles.input}
                                            left={<TextInput.Icon icon="key" />}
                                            outlineStyle={{ borderRadius: 12 }}
                                        />

                                        <TextInput
                                            label="New Password"
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            mode="outlined"
                                            secureTextEntry={!showPassword}
                                            style={styles.input}
                                            left={<TextInput.Icon icon="lock" />}
                                            right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
                                            outlineStyle={{ borderRadius: 12 }}
                                        />

                                        {error && <HelperText type="error" visible={true}>{error}</HelperText>}

                                        <Button
                                            mode="contained"
                                            onPress={handleResetPassword}
                                            loading={loading}
                                            disabled={loading}
                                            style={styles.submitButton}
                                            contentStyle={styles.buttonContent}
                                        >
                                            Reset Password
                                        </Button>

                                        <Button
                                            mode="text"
                                            onPress={() => setStep('request')}
                                            style={{ marginTop: 8 }}
                                        >
                                            Didn&apos;t receive an email? Request a new link
                                        </Button>
                                    </>
                                )}

                                {step === 'success' && (
                                    <View style={styles.successContainer}>
                                        <Text variant="bodyMedium" style={styles.successText}>
                                            Your password has been reset successfully. You can now sign in with your new password.
                                        </Text>
                                        <Button
                                            mode="contained"
                                            onPress={() => router.replace('/login')}
                                            style={styles.submitButton}
                                            contentStyle={styles.buttonContent}
                                        >
                                            Back to Sign In
                                        </Button>
                                    </View>
                                )}

                                <View style={styles.footer}>
                                    <Button
                                        mode="text"
                                        onPress={() => router.back()}
                                    >
                                        Back to Sign In
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
    input: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    submitButton: {
        borderRadius: 12,
        marginTop: 8,
    },
    buttonContent: {
        paddingVertical: 12,
    },
    successContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    successText: {
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    footer: {
        alignItems: 'center',
        marginTop: 24,
    },
});