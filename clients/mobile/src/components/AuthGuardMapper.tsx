import React, {useCallback, useState} from 'react';
import {useFocusEffect} from 'expo-router';
import {ActivityIndicator, View} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AutGuard from '../components/AuthGuard';
import {useTheme} from '../context/ThemeContext';


export const AuthGuardWrapper = ({children}: { children: React.ReactNode }) => {
    const {theme} = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useFocusEffect(useCallback(() => {
        let active = true;
        setIsLoading(true);
        SecureStore.getItemAsync('userToken')
            .then(token => {if (active) setIsAuthenticated(!!token);})
            .catch(() => {if (active) setIsAuthenticated(false);})
            .finally(() => {if (active) setIsLoading(false);});
        return () => {active = false;};
    }, []));

    if (isLoading) {
        return (
            <View style={{flex: 1, justifyContent: 'center', backgroundColor: theme.background}}>
                <ActivityIndicator color={theme.accent} size="large"/>
            </View>
        );
    }

    if (!isAuthenticated) {
        return <AutGuard/>;
    }

    return <>{children}</>;
};
