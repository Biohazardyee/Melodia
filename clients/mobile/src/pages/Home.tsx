import React, {useState, useRef, useEffect} from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Keyboard,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import Skeleton from '../components/Skeleton';
import Header from "@/src/components/Header";
import AlbumCard from "@/src/components/AlbumCard";
import apiClient from "../api/client";
import {useTranslation} from "react-i18next";
import {useTheme} from "../context/ThemeContext";

const Home: React.FC = () => {
    const {t} = useTranslation();
    const {theme} = useTheme();

    const SORT_OPTIONS = [
        {value: "az", label: t("sort_az")},
        {value: "rated", label: t("sort_rating")},
    ];

    const [searchQuery, setSearchQuery] = useState("");
    const [albums, setAlbums] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSort, setSelectedSort] = useState(SORT_OPTIONS[0]);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchError, setSearchError] = useState(false);
    const request = useRef<AbortController | null>(null);
    useEffect(() => () => {request.current?.abort();}, []);
    const [searchMode, setSearchMode] = useState<"artist" | "album">("artist");

    const handleSearch: () => Promise<void> = async (): Promise<void> => {
        const query: string = searchQuery.trim();

        if (!query || request.current) return;
        const controller = new AbortController();
        request.current = controller;
        setHasSearched(true);
        setSearchError(false);
        setLoading(true);
        Keyboard.dismiss();

        try {
            let url: string;
            if (searchMode === "artist") {
                url = `/api/artists/info/top-albums?artist=${encodeURIComponent(query)}`;
            } else {
                url = `/api/search?query=${encodeURIComponent(query)}`;
            }

            const response = await apiClient.get(url, {signal: controller.signal});
            let rawData: any[];
            if (searchMode === "artist") {
                rawData = response.data?.topAlbums?.topalbums?.album || [];
            } else {
                rawData =
                    response.data?.searchResults?.results?.albummatches?.album || [];
            }

            if (Array.isArray(rawData)) {
                const fetchedAlbums = rawData.map((a: any) => {
                    const artistName =
                        typeof a.artist === "string"
                            ? a.artist
                            : a.artist?.name || "Inconnu";

                    const apiId = a.mbid || `album:${artistName}:${a.name}`;

                    return {
                        id: apiId,
                        album: a.name,
                        artist: artistName,

                        cover:
                            a.image?.find((img: any): boolean => img.size === "extralarge")?.[
                                "#text"
                                ] ||
                            a.image?.[2]?.["#text"] ||
                            "",
                        rating: 0,
                        mbid: a.mbid || null,
                    };
                });

                try {
                    const syncResponse = await apiClient.post("/medias/sync-search", {
                        albums: fetchedAlbums.map((album) => ({
                            api_id: album.id,
                            name: album.album,
                            artist: album.artist,
                            cover: album.cover,
                            mbid: album.mbid,
                        })),
                    }, {signal: controller.signal});

                    const syncedAlbums = syncResponse.data.medias || [];

                    if (syncedAlbums.length > 0) {
                        const mappedAlbums = syncedAlbums.map((syncedAlbum: any) => ({
                            id: syncedAlbum.id,
                            apiId: syncedAlbum.api_id,
                            album: syncedAlbum.name || syncedAlbum.album,
                            artist: syncedAlbum.artist,
                            cover: syncedAlbum.cover,
                            rating: syncedAlbum.rating || 0,
                            mbid: syncedAlbum.mbid || null,
                        }));

                        const uniqueAlbumsMap: Map<string, any> = new Map<string, any>();
                        mappedAlbums.forEach((album: any): void => {
                            if (album.id && !uniqueAlbumsMap.has(album.id)) {
                                uniqueAlbumsMap.set(album.id, album);
                            }
                        });

                        const finalAlbums: any[] = Array.from(uniqueAlbumsMap.values());
                        setAlbums(finalAlbums);
                        applySort(finalAlbums, selectedSort.value);
                    } else {
                        setAlbums(fetchedAlbums);
                        applySort(fetchedAlbums, selectedSort.value);
                    }
                } catch (err: any) {
                    if (controller.signal.aborted) return;
                    console.warn(
                        "⚠️ Sync échoué, affichage des résultats sans notes:",
                        err.response?.status,
                        err.response?.data?.message || err.message,
                    );

                    setAlbums(fetchedAlbums);
                    applySort(fetchedAlbums, selectedSort.value);
                }
            }
        } catch (error: any) {
            if (controller.signal.aborted) return;
            setSearchError(true);
            setAlbums([]);
        } finally {
            request.current = null;
            if (!controller.signal.aborted) setLoading(false);
        }
    };

    const applySort: (data: any[], sortValue: string) => void = (data: any[], sortValue: string): void => {
        let sorted: any[] = [...data];
        if (sortValue === "az") {
            sorted.sort((a, b) => (a.album || "").localeCompare(b.album || ""));
        } else if (sortValue === "rated") {
            sorted.sort((a, b): number => (b.rating || 0) - (a.rating || 0));
        }
        setAlbums(sorted);
    };

    return (
        <View style={[styles.container, {backgroundColor: theme.background}]}>
            <Header/>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
                <View style={styles.heading}>
                    <Text style={[styles.eyebrow, {color: theme.accent}]}>MELODIA · {t('mobile_explore').toUpperCase()}</Text>
                    <Text style={[styles.title, {color: theme.text}]}>{t('explore_title')}</Text>
                    <Text style={[styles.subtitle, {color: theme.subText}]}>{t('mobile_search_intro')}</Text>
                </View>
                <View style={[styles.filterCard, {backgroundColor: theme.card, borderColor: theme.border}]}>
                    <View style={[styles.tabs, {backgroundColor: theme.surface}]}>
                        {(['artist', 'album'] as const).map(mode => <TouchableOpacity key={mode} disabled={loading}
                            accessibilityRole="tab" accessibilityState={{selected: searchMode === mode, disabled: loading}}
                            onPress={() => setSearchMode(mode)} style={[styles.tab, searchMode === mode && {backgroundColor: theme.action}]}>
                            <Text style={[styles.tabText, {color: searchMode === mode ? '#fff' : theme.subText}]}>{t(mode === 'artist' ? 'search_artist_tab' : 'search_album_tab')}</Text>
                        </TouchableOpacity>)}
                    </View>
                    <View style={[styles.searchBar, {backgroundColor: theme.inputBg, borderColor: theme.border}]}>
                        <Ionicons name="search-outline" size={21} color={theme.subText}/>
                        <TextInput accessibilityLabel={t('search_label')} placeholder={t(searchMode === 'artist' ? 'search_artist_placeholder' : 'search_album_placeholder')}
                            placeholderTextColor={theme.placeholder} style={[styles.searchInput, {color: theme.text}]}
                            value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={handleSearch} returnKeyType="search" editable={!loading}/>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('search_submit_btn')} accessibilityState={{disabled: loading || !searchQuery.trim(), busy: loading}}
                            disabled={loading || !searchQuery.trim()} onPress={handleSearch} style={[styles.searchButton, {backgroundColor: theme.action, opacity: !searchQuery.trim() ? 0.4 : 1}]}>
                            {loading ? <ActivityIndicator color="#fff"/> : <Ionicons name="arrow-forward" size={21} color="#fff"/>}
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.resultsHeader}>
                    <Text style={[styles.resultsText, {color: theme.subText}]}>{hasSearched && !loading ? t(albums.length === 1 ? 'results_count' : 'results_count_plural', {count: albums.length}) : t('sort_label')}</Text>
                    <View style={styles.sortOptions}>
                        {SORT_OPTIONS.map(option => <TouchableOpacity key={option.value} disabled={loading} accessibilityRole="button"
                            accessibilityState={{selected: selectedSort.value === option.value}} onPress={() => {setSelectedSort(option); applySort(albums, option.value);}}
                            style={[styles.sortChip, {borderColor: selectedSort.value === option.value ? theme.accent : theme.border, backgroundColor: theme.card}]}>
                            <Text style={{fontSize: 12, color: selectedSort.value === option.value ? theme.accent : theme.subText}}>{option.label}</Text>
                        </TouchableOpacity>)}
                    </View>
                </View>
                {loading ? <View style={styles.grid}>{[0,1,2,3].map(i => <View key={i} style={styles.column}><Skeleton style={{aspectRatio: 1}}/><Skeleton style={{height: 14, width: '75%', marginTop: 12}}/></View>)}</View>
                : searchError ? <View style={[styles.empty, {borderColor: theme.border}]}>
                    <Ionicons name="cloud-offline-outline" size={32} color={theme.accent}/>
                    <Text style={[styles.emptyText, {color: theme.subText}]}>{t('mobile_load_error')}</Text>
                    <TouchableOpacity accessibilityRole="button" onPress={handleSearch} style={styles.retry}><Text style={{color: theme.accent}}>{t('mobile_retry')}</Text></TouchableOpacity>
                </View>
                : albums.length ? <View style={styles.grid}>{albums.map(item => <View key={item.id} style={styles.column}>
                    <AlbumCard id={item.id} title={item.album} artist={item.artist} cover={item.cover} rating={String(item.rating || 0)}/>
                </View>)}</View>
                : <View style={[styles.empty, {borderColor: theme.border}]}>
                    <View style={[styles.emptyIcon, {backgroundColor: theme.accentSoft}]}><Ionicons name="disc-outline" size={42} color={theme.accent}/></View>
                    <Text style={[styles.emptyText, {color: theme.subText}]}>{t(hasSearched ? 'mobile_no_results' : 'mobile_search_empty')}</Text>
                </View>}
            </ScrollView>
        </View>
    );
};
const styles = StyleSheet.create({
    container: {flex: 1},
    scroll: {padding: 20, paddingBottom: 32, width: '100%', maxWidth: 800, alignSelf: 'center'},
    heading: {marginBottom: 24, gap: 8},
    eyebrow: {fontSize: 10, letterSpacing: 1.8, fontWeight: '700'},
    title: {fontSize: 34, fontWeight: '700', letterSpacing: -1.2},
    subtitle: {fontSize: 14, lineHeight: 22},
    filterCard: {padding: 14, borderRadius: 22, borderWidth: 1, gap: 14},
    tabs: {flexDirection: 'row', borderRadius: 12, padding: 4},
    tab: {flex: 1, minHeight: 44, padding: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10},
    tabText: {fontWeight: '600', fontSize: 13},
    searchBar: {flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 5, paddingVertical: 5, gap: 8, borderWidth: 1, borderRadius: 14},
    searchInput: {flex: 1, minWidth: 0, fontSize: 14, minHeight: 44},
    searchButton: {width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
    resultsHeader: {gap: 10, marginVertical: 22},
    resultsText: {fontSize: 12},
    sortOptions: {flexDirection: 'row', gap: 8, flexWrap: 'wrap'},
    sortChip: {minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 12, borderWidth: 1},
    grid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16},
    column: {width: '48%'},
    empty: {borderWidth: 1, borderStyle: 'dashed', borderRadius: 24, padding: 28, alignItems: 'center', gap: 18},
    emptyIcon: {width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center'},
    emptyText: {textAlign: 'center', fontSize: 15, lineHeight: 24, maxWidth: 260},
    retry: {minHeight: 44, justifyContent: 'center'},
});
export default Home;
