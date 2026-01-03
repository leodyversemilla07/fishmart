import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'none',
                animationDuration: 300,
                gestureEnabled: true,
                gestureDirection: 'horizontal',
            }}
        >
            <Stack.Screen
                name="login"
                options={{
                    animation: 'none',
                }}
            />
            <Stack.Screen
                name="signup"
                options={{
                    animation: 'none',
                }}
            />
            <Stack.Screen
                name="forgot-password"
                options={{
                    animation: 'none',
                    presentation: 'modal',
                }}
            />
        </Stack>
    );
}
