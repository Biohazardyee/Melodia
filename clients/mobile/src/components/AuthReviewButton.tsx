import {brand} from '../design/tokens';
import React from 'react';
import {TouchableOpacity, Text, StyleSheet, View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from 'expo-router';
import {useTranslation} from 'react-i18next';

interface AuthReviewButtonProps {
    onPress: () => void;
    isLoggedIn: boolean;
}

export const AuthReviewButton: React.FC<AuthReviewButtonProps> = ({onPress, isLoggedIn}: AuthReviewButtonProps) => {
    const router = useRouter();
    const {t} = useTranslation();

    if (!isLoggedIn) {
        return (
            <TouchableOpacity
                style={styles.guestButton}
                onPress={(): void => router.push('/restriction')}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[brand.primary, '#ec4899']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.gradientBorder}
                >
                    <View style={styles.innerContainer}>
                        <Ionicons name="lock-closed" size={18} color="#ec4899" style={{marginRight: 10}}/>
                        <Text style={styles.guestText}>{t('review_login_prompt')}</Text>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity style={styles.authButton} onPress={onPress}>
            <Ionicons name="create-outline" size={20} color="white" style={{marginRight: 10}}/>
            <Text style={styles.authText}>{t('review_post_button')}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    guestButton: {
        height: 55,
        borderRadius: 15,
        overflow: 'hidden',
        marginVertical: 15,
    },
    gradientBorder: {
        flex: 1,
        padding: 1.5,
        borderRadius: 15,
    },
    innerContainer: {
        flex: 1,
        backgroundColor: '#1C1C28',
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    guestText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },

    authButton: {
        backgroundColor: brand.primary,
        height: 55,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 15,
        shadowColor: brand.primary,
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    authText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
