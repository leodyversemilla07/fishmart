import { api } from '@/convex/_generated/api';
import { useAction } from 'convex/react';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';

export default function SignupScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const theme = useTheme();
    const signUpAction = useAction(api.auth.signUp);

    const handleSignup = async () => {
        if (!email || !password || !firstName || !lastName) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError(null);



        try {
            const result = await signUpAction({
                email,
                password,
                firstName,
                middleName,
                lastName,
                role: 'BUYER', // Default role
            });

            if ('error' in result) {
                setError(result.error);
                return;
            }

            Alert.alert('Success', 'Account created! Please sign in.');
            router.replace('/login');
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
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

                                <Text variant="headlineMedium" style={styles.title}>Create Account</Text>
                                <Text variant="bodyLarge" style={styles.subtitle}>Join the biggest aquatic community in PH</Text>
                            </View>

                            <View style={styles.form}>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <TextInput
                                        label="First Name"
                                        value={firstName}
                                        onChangeText={setFirstName}
                                        mode="outlined"
                                        style={[styles.input, { flex: 1 }]}
                                        outlineStyle={{ borderRadius: 12 }}
                                    />
                                    <TextInput
                                        label="Last Name"
                                        value={lastName}
                                        onChangeText={setLastName}
                                        mode="outlined"
                                        style={[styles.input, { flex: 1 }]}
                                        outlineStyle={{ borderRadius: 12 }}
                                    />
                                </View>

                                <TextInput
                                    label="Middle Name (Optional)"
                                    value={middleName}
                                    onChangeText={setMiddleName}
                                    mode="outlined"
                                    style={styles.input}
                                    left={<TextInput.Icon icon="account" />}
                                    outlineStyle={{ borderRadius: 12 }}
                                />

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

                                <Button
                                    mode="contained"
                                    onPress={handleSignup}
                                    loading={loading}
                                    disabled={loading}
                                    style={styles.signupButton}
                                    contentStyle={styles.signupButtonContent}
                                >
                                    Get Started
                                </Button>

                                <View style={styles.footer}>
                                    <Text variant="bodyMedium" style={{ color: '#666' }}>Already have an account? </Text>
                                    <Link href="/login" asChild>
                                        <Button mode="text" compact labelStyle={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                                            Sign In
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
    signupButton: {
        borderRadius: 12,
        marginTop: 16,
    },
    signupButtonContent: {
        paddingVertical: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32,
    },
});
