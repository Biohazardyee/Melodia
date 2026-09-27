import React from 'react';
import {View, Text, StyleSheet, Platform, StatusBar, ScrollView} from 'react-native';
import BackButton from '../components/BackButton';
import {useTheme} from '../context/ThemeContext';
import {useTranslation} from 'react-i18next';

const Privacy = () => {
    const {theme} = useTheme();
    const {t} = useTranslation();

    return (
        <View style={[styles.container, {backgroundColor: theme.background}]}>
            <View style={styles.header}>
                <BackButton/>
                <Text style={[styles.headerTitle, {color: theme.text}]}>{t('privacy_header')}</Text>
                <View style={{width: 45}}/>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, {backgroundColor: theme.card}]}>
                    <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('privacy_section_1_title')}</Text>
                    <Text style={[styles.paragraph, {color: theme.subText}]}>
                        {t('privacy_section_1_text')}
                    </Text>

                    <Text style={[styles.sectionTitle, {color: theme.text, marginTop: 20}]}>
                        {t('privacy_section_2_title')}
                    </Text>
                    <Text style={[styles.paragraph, {color: theme.subText}]}>
                        {t('privacy_section_2_text')}
                    </Text>

                    <Text style={[styles.sectionTitle, {color: theme.text, marginTop: 20}]}>
                        {t('privacy_section_3_title')}
                    </Text>
                    <Text style={[styles.paragraph, {color: theme.subText}]}>
                        {t('privacy_section_3_text')}
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {flex: 1},
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingTop: 16,
        paddingBottom: 15,
    },
    headerTitle: {fontSize: 22, fontWeight: 'bold', flex: 1, textAlign: 'center'},
    content: {flex: 1, padding: 20},
    card: {
        padding: 20,
        borderRadius: 15,
        marginBottom: 40,
    },
    sectionTitle: {fontSize: 18, fontWeight: 'bold', marginBottom: 10},
    paragraph: {fontSize: 15, lineHeight: 24}
});

export default Privacy;
