import React, {createContext, useContext, useState, useEffect} from 'react';
import {palettes} from '../design/tokens';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const Colors = palettes;

const ThemeContext = createContext({
    isDarkMode: true,
    toggleTheme: async (value: boolean): Promise<void> => {
    },
    theme: Colors.dark,
});

export const ThemeProvider = ({children}: { children: React.ReactNode }) => {
    const [isDarkMode, setIsDarkMode] = useState(true);

    useEffect((): void => {
        const loadTheme: () => Promise<void> = async (): Promise<void> => {
            try {
                const savedTheme: string | null = await AsyncStorage.getItem('pref_darkmode');
                if (savedTheme === 'true' || savedTheme === 'false') {
                    setIsDarkMode(savedTheme === 'true');
                }
            } catch (e) {
                console.error("Erreur chargement thème", e);
            }
        };
        loadTheme();
    }, []);

    const toggleTheme: (value: boolean) => Promise<void> = async (value: boolean): Promise<void> => {
        setIsDarkMode(value);
        await AsyncStorage.setItem('pref_darkmode', JSON.stringify(value));
    };

    const theme = isDarkMode ? Colors.dark : Colors.light;

    return (
        <ThemeContext.Provider value={{isDarkMode, toggleTheme, theme}}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
