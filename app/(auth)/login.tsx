import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/authStore';
import { useAction } from 'convex/react';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const theme = useTheme();
    const loginAction = useAction(api.auth.signIn);
    const { login } = useAuthStore();

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await loginAction({
                email,
                password,
            });

            if ('error' in result) {
                setError(result.error);
                return;
            }

            if (result.user) {
                login(result.user as any); // Cast because store expects generic _id match
                router.replace('/(tabs)');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
            console.error(err);
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
                                    style={styles.logo as any}
                                    contentFit="contain"
                                />

                                <Text variant="headlineMedium" style={styles.title}>Welcome Back</Text>
                                <Text variant="bodyLarge" style={styles.subtitle}>Sign in to continue your aquatic journey</Text>
                            </View>

                            <View style={styles.form}>
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

                                <TextInput
                                    label="Password"
                                    value={password}
                                    onChangeText={setPassword}
                                    mode="outlined"
                                    secureTextEntry={!showPassword}
                                    style={styles.input}
                                    left={<TextInput.Icon icon="lock" />}
                                    right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
                                    outlineStyle={{ borderRadius: 12 }}
                                />

                                {error && <HelperText type="error" visible={true}>{error}</HelperText>}

                                <Button mode="text" style={styles.forgotPassword} onPress={() => router.push('/forgot-password')}>
                                    Forgot Password?
                                </Button>

                                <Button
                                    mode="contained"
                                    onPress={handleLogin}
                                    loading={loading}
                                    disabled={loading}
                                    style={styles.loginButton}
                                    contentStyle={styles.loginButtonContent}
                                >
                                    Sign In
                                </Button>


                                <View style={styles.footer}>
                                    <Text variant="bodyMedium" style={{ color: '#666' }}>Don&apos;t have an account? </Text>
                                    <Link href="/signup" asChild>
                                        <Button mode="text" compact labelStyle={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                                            Sign Up
                                        </Button>
                                    </Link>
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
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 16,
    },

    loginButton: {
        borderRadius: 12,
        marginTop: 8,
    },
    loginButtonContent: {
        paddingVertical: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32,
    },
});
