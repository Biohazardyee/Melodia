import {useEffect} from 'react';
import {Platform} from 'react-native';
import {isRunningInExpoGo} from 'expo';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/client';

export const usePushNotifications: (userId: string | null) => void = (userId: string | null): void => {
    useEffect(() => {
        // Expo Go has no remote push support. Avoid importing the module on web/Go,
        // where its native registration side effects are unavailable as well.
        if (!userId || Platform.OS === 'web' || isRunningInExpoGo()) return;
        let cancelled = false;

        const register: () => Promise<void> = async (): Promise<void> => {
            if (!Device.isDevice) return;

            const userToken: string | null = await SecureStore.getItemAsync("userToken");
            if (!userToken || cancelled) return;

            const Notifications = await import('expo-notifications');
            if (cancelled) return;
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                    shouldShowBanner: true,
                    shouldShowList: true,
                }),
            });
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'Melodia',
                    importance: Notifications.AndroidImportance.DEFAULT,
                });
            }

            const {status: existingStatus} = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const {status} = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted' || cancelled) return;

            const token: string = (await Notifications.getExpoPushTokenAsync({
                projectId: 'a961ba89-48ee-4ea9-b8da-8772ef87999f'
            })).data;

            if (cancelled) return;

            try {
                await apiClient.post('/users/update-push-token', {
                    user_id: userId,
                    token
                });
            } catch (e) {
                console.error("Erreur enregistrement token:", e);
            }
        };

        register().catch(error => {
            // Permissions and Expo token requests can fail before the API call.
            console.warn('Push registration unavailable:', error instanceof Error ? error.message : 'unknown error');
        });
        return () => { cancelled = true; };
    }, [userId]);
};
