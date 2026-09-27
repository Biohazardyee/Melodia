import {brand} from '../design/tokens';
import React, {useEffect, useState} from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import {PieChart} from "react-native-gifted-charts";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import Header from "@/src/components/Header";
import {AuthGuardWrapper} from "../components/AuthGuardMapper";
import StatCardStats from "../components/StatCardStats";
import apiClient from "../api/client";
import {jwtDecode} from "jwt-decode";
import * as SecureStore from "expo-secure-store";
import {useTranslation} from "react-i18next";
import {useTheme} from "../context/ThemeContext";

const Stats = () => {
    const router = useRouter();
    const {t} = useTranslation();
    const {theme} = useTheme();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        listened: 0,
        later: 0,
        favorite: 0,
        disliked: 0,
    });

    useEffect((): void => {
        loadUserStats();
    }, []);

    const loadUserStats: () => Promise<void> = async (): Promise<void> => {
        try {
            const token: string | null = await SecureStore.getItemAsync("userToken");
            if (!token) return;

            const decoded: any = jwtDecode(token);
            const userId = decoded.id;

            const response = await apiClient.get(`/medias/status/user/${userId}`);
            const data = response.data.mediasStatus;

            const counts = {
                listened: data.filter((m: any): boolean => m.status === "listened").length,
                later: data.filter((m: any): boolean => m.status === "later").length,
                favorite: data.filter((m: any): boolean => m.status === "favorite").length,
                disliked: data.filter((m: any): boolean => m.status === "disliked").length,
            };

            setStats(counts);
        } catch (error) {
            console.error("Erreur lors du chargement des stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const pieData: { value: number; color: string }[] = [
        {value: stats.listened, color: "#00ffa3"},
        {value: stats.later, color: brand.primary},
        {value: stats.favorite, color: "#fbbf24"},
        {value: stats.disliked, color: "#f43f5e"},
    ];

    const Legend = ({item, color}: { item: string; color: string }) => (
        <View style={styles.legendItem}>
            <View style={[styles.dot, {backgroundColor: color}]}/>
            <Text style={[styles.legendLabel, {color: theme.text}]}>{item}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, {backgroundColor: theme.background, justifyContent: "center"}]}>
                <ActivityIndicator size="large" color={theme.accent}/>
            </View>
        );
    }

    return (
        <AuthGuardWrapper>
            <View style={[styles.container, {backgroundColor: theme.background}]}>
                <Header/>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={styles.header}>
                        <Text style={[styles.mainTitle, {color: theme.text}]}>{t("stats_title")}</Text>
                    </View>

                    <View style={styles.grid}>
                        <StatCardStats
                            title={t("status_completed")}
                            count={stats.listened.toString()}
                            icon="check-circle-outline"
                            color="#00ffa3"
                            onPress={(): void =>
                                router.push({
                                    pathname: "/statDetails",
                                    params: {type: "listened"},
                                })
                            }
                        />
                        <StatCardStats
                            title={t("status_listening")}
                            count={stats.later.toString()}
                            icon="playlist-music"
                            color={theme.accent}
                            onPress={(): void =>
                                router.push({
                                    pathname: "/statDetails",
                                    params: {type: "later"},
                                })
                            }
                        />
                        <StatCardStats
                            title={t("status_wishlist")}
                            count={stats.favorite.toString()}
                            icon="star"
                            color="#fbbf24"
                            onPress={(): void =>
                                router.push({
                                    pathname: "/statDetails",
                                    params: {type: "favorite"},
                                })
                            }
                        />
                        <StatCardStats
                            title={t("status_dropped")}
                            count={stats.disliked.toString()}
                            icon="close-circle-outline"
                            color="#f43f5e"
                            onPress={(): void =>
                                router.push({
                                    pathname: "/statDetails",
                                    params: {type: "disliked"},
                                })
                            }
                        />
                    </View>

                    <View style={[styles.chartBox, {backgroundColor: theme.card}]}>
                        <View style={styles.chartHeaderRow}>
                            <Ionicons name="stats-chart" size={20} color={theme.accent}/>
                            <Text style={[styles.chartHeaderText, {color: theme.text}]}>
                                {t("stats_detail_title")}
                            </Text>
                        </View>
                        <View style={styles.pieWrapper}>
                            {stats.listened + stats.later + stats.favorite + stats.disliked >
                            0 ? (
                                <PieChart
                                    donut
                                    radius={80}
                                    innerRadius={60}
                                    data={pieData}
                                    innerCircleColor={theme.card}
                                    centerLabelComponent={() => (
                                        <Icon name="music" size={50} color={theme.accent}/>
                                    )}
                                />
                            ) : (
                                <Text style={{color: theme.subText, paddingVertical: 20}}>
                                    {t("stats_no_data")}
                                </Text>
                            )}
                        </View>
                        <View style={styles.legendGrid}>
                            <Legend item={t("status_completed")} color="#00ffa3"/>
                            <Legend item={t("status_listening")} color={theme.accent}/>
                            <Legend item={t("status_wishlist")} color="#fbbf24"/>
                            <Legend item={t("status_dropped")} color="#f43f5e"/>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </AuthGuardWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    header: {
        marginBottom: 25,
    },
    mainTitle: {
        fontSize: 28,
        fontWeight: "bold",
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    chartBox: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 30,
    },
    chartHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    chartHeaderText: {
        marginLeft: 10,
    },
    pieWrapper: {
        alignItems: "center",
    },
    legendGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        marginTop: 20,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        margin: 8,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 5,
    },
    legendLabel: {
        fontSize: 12,
    },
});

export default Stats;
