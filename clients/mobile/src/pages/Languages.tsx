import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import BackButton from "../components/BackButton";
import { useTheme } from "../context/ThemeContext";
import i18n from "../i18n";

const AVAILABLE_LANGUAGES = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
];

const Languages = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [selectedLang, setSelectedLang] = useState(i18n.language ?? "fr");
  const [isChanging, setIsChanging] = useState(false);

  useEffect((): void => {
    const loadLanguage = async (): Promise<void> => {
      try {
        const savedLang = await SecureStore.getItemAsync("user_language");
        if (savedLang) {
          setSelectedLang(savedLang);
        }
      } catch (e) {
        console.error("Erreur chargement langue", e);
      }
    };
    loadLanguage();
  }, []);

  const handleLanguageChange = async (langCode: string): Promise<void> => {
    if (langCode === selectedLang) return;
    setSelectedLang(langCode);
    setIsChanging(true);
    try {
      SecureStore.setItem("user_language", langCode);

      await i18n.changeLanguage(langCode);
    } catch (e) {
      console.error("Erreur changement langue", e);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t("language_title")}
        </Text>
        <View style={{ width: 45 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          {AVAILABLE_LANGUAGES.map((lang, index) => {
            const isSelected = selectedLang === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageRow,
                  { borderBottomColor: theme.border },
                  index === AVAILABLE_LANGUAGES.length - 1 && {
                    borderBottomWidth: 0,
                  },
                ]}
                onPress={() => handleLanguageChange(lang.code)}
                activeOpacity={0.7}
              >
                <Text style={styles.flag}>{lang.flag}</Text>
                <Text style={[styles.languageName, { color: theme.text }]}>
                  {lang.label}
                </Text>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={theme.accent}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.infoText, { color: theme.subText }]}>
          {t("language_currently", {
            language: AVAILABLE_LANGUAGES.find((l) => l.code === selectedLang)
              ?.label,
          })}
        </Text>
      </View>

      {isChanging && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.loadingOverlay,
            { backgroundColor: theme.background },
          ]}
        >
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: 16,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  content: { flex: 1, padding: 20 },
  card: { borderRadius: 15, overflow: "hidden" },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
  },
  flag: { fontSize: 24, marginRight: 15 },
  languageName: { flex: 1, fontSize: 16, fontWeight: "500" },
  infoText: { marginTop: 20, textAlign: "center", fontSize: 14 },
  loadingOverlay: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
});

export default Languages;
