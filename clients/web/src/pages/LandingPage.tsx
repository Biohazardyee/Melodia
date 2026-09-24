import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ArrowUpRight, ArrowRight, Library, Star, Users, ChartNoAxesCombined, Globe, Radio, Music2} from "lucide-react";
import {AlbumCard} from "../components/AlbumCard";
import {Footer} from "../components/Footer";
import apiClient from "../api/client";

export function LandingPage() {
    const {t} = useTranslation();
    const [albums, setAlbums] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        apiClient.get("/medias/trending?limit=4", {signal: controller.signal}).then(({data}) => {
            setAlbums((data.medias || []).map((a: any) => ({id: a.id, title: a.name, artist: a.artist, cover: a.cover, rating: Number(a.rating) || 0})));
        }).catch(() => {if (!controller.signal.aborted) setFailed(true);})
          .finally(() => {if (!controller.signal.aborted) setLoading(false);});
        return () => controller.abort();
    }, []);
    const features = [Library, Star, Users, ChartNoAxesCombined, Globe, Radio];
    return <div className="min-h-screen bg-canvas text-ink">
        <header className="landing-nav">
            <Link to="/" className="flex items-center gap-3"><img src="/logo.png" alt="" className="w-9 h-9 rounded-xl"/><span className="brand-word">melodia.</span></Link>
            <nav className="flex items-center gap-4 sm:gap-8" aria-label={t("menu_title")}>
                <Link to="/home" className="text-sm text-muted hover:text-accent hidden sm:block">{t("explore_title")}</Link>
                <Link to="/login" className="secondary-action text-sm">{t("design_sign_in")}<ArrowUpRight size={15}/></Link>
            </nav>
        </header>
        <main>
            <section className="landing-hero">
                <div><span className="eyebrow flex items-center gap-2"><Music2 size={14}/>{t("design_header_note")}</span>
                    <h1>{t("design_landing_title")}<br/><em>{t("design_landing_emphasis")}</em></h1>
                    <p>{t("landing_hero_subtitle")}</p>
                    <div className="flex flex-wrap gap-3 mt-8">
                        <Link to="/register" className="primary-action">{t("landing_btn_register")}<ArrowRight size={18}/></Link>
                        <Link to="/home" className="secondary-action">{t("explore_title")}</Link>
                    </div>
                    <p className="text-xs mt-6">{t("design_landing_note")}</p>
                </div>
                <div className="landing-art">
                    <div className="w-full text-xs text-muted"><span>MELODIA</span></div>
                    <img src="/logo.png" alt="Melodia" className="w-56 sm:w-64 aspect-square rounded-[24%] object-cover"/>
                    <div className="w-full border-t border-line pt-5 flex items-center justify-between gap-4">
                        <div><span className="eyebrow">{t("design_your_space")}</span><p className="text-ink text-lg font-semibold mt-1">{t("design_record_caption")}</p></div>
                        <Music2 className="text-accent" size={28}/>
                    </div>
                </div>
            </section>
            <section className="landing-section">
                <div className="section-topline"><div><p className="eyebrow mb-3">{t("design_discovery_label")}</p><h2>{t("landing_trending_title")}</h2></div>
                    <Link to="/home" className="flex items-center gap-2 text-sm text-accent">{t("explore_title")}<ArrowUpRight size={17}/></Link></div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6" aria-busy={loading}>
                    {loading ? Array.from({length: 4}, (_,i) => <div className="album-card" key={i} aria-hidden="true"><div className="skeleton aspect-square rounded-xl"/><div className="skeleton h-4 mt-5 mb-3 rounded w-3/4"/><div className="skeleton h-3 mb-4 rounded w-1/2"/></div>)
                        : albums.map(album => <AlbumCard key={album.id} {...album}/>)}
                </div>
                {!loading && !albums.length && <div className="empty-state"><Music2 className="mx-auto text-accent" size={28}/><p className="mt-4">{t(failed ? "design_trending_error" : "no_albums_available")}</p><Link to="/home" className="secondary-action mt-5">{t("explore_title")}</Link></div>}
            </section>
            <section className="landing-section">
                <div className="section-topline"><div><p className="eyebrow mb-3">{t("design_more_than_music")}</p><h2>{t("landing_features_title")}</h2></div><p className="text-muted text-sm max-w-md">{t("landing_features_subtitle")}</p></div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {features.map((Icon,i) => <article key={i} className="bg-panel border border-line rounded-2xl p-7">
                        <div className="flex justify-between items-center mb-8"><Icon className="text-accent" size={25}/><span className="eyebrow">0{i+1}</span></div>
                        <h3 className="font-semibold text-lg mb-3">{t(`feature_${i+1}_title`)}</h3><p className="text-muted text-sm leading-relaxed">{t(`feature_${i+1}_desc`)}</p>
                    </article>)}
                </div>
            </section>
            <section className="landing-section">
                <div className="editorial-hero"><div><span className="eyebrow">{t("design_listen_together")}</span><h2 className="text-3xl sm:text-4xl font-semibold my-4">{t("landing_cta_title")}</h2><p>{t("landing_cta_subtitle")}</p></div>
                    <Link to="/register" className="primary-action whitespace-nowrap">{t("landing_cta_btn")}<ArrowRight size={18}/></Link>
                </div>
            </section>
        </main>
        <Footer/>
    </div>;
}
