import {useEffect, useRef, useState} from "react";
import {BookHeart} from "lucide-react";
import {NavLink, useNavigate} from "react-router-dom";
import {Compass, Library, Rocket, BarChart2, Shield, Settings, X, Sun, Moon, Globe, ShoppingBag, Palette, Radio, ChevronDown} from "lucide-react";
import {useTranslation} from "react-i18next";
import {jwtDecode} from "jwt-decode";
import {useDarkMode} from "../useDarkMode";
import {PREMIUM_THEMES, type Theme} from "../themes.config";
import apiClient from "../api/client";

const LANGUAGE_NAMES: Record<string, string> = {fr: "Français", en: "English", es: "Español", de: "Deutsch", it: "Italiano"};

type SidebarProps = {isOpen: boolean; onClose: () => void; persistent?: boolean};

export default function Sidebar({isOpen, onClose, persistent = false}: SidebarProps) {
    const {t, i18n} = useTranslation();
    const navigate = useNavigate();
    const {theme, setTheme} = useDarkMode();
    const [desktop, setDesktop] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);
    const [owned, setOwned] = useState<string[]>([]);
    const [themeOpen, setThemeOpen] = useState(false);
    const [languageOpen, setLanguageOpen] = useState(false);
    const visible = isOpen || (persistent && desktop);
    const sidebarRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!isOpen || (persistent && desktop)) return;
        const previousFocus = document.activeElement as HTMLElement | null;
        const panel = sidebarRef.current;
        const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)") || [])
            .filter(element => element.getClientRects().length > 0);
        focusable()[0]?.focus();
        const trapFocus = (event: KeyboardEvent) => {
            if (event.key !== "Tab") return;
            const elements = focusable();
            const first = elements[0], last = elements[elements.length - 1];
            if (!first || !last) return;
            if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
            else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
        };
        panel?.addEventListener("keydown", trapFocus);
        return () => {panel?.removeEventListener("keydown", trapFocus); previousFocus?.focus();};
    }, [isOpen, persistent, desktop]);

    useEffect(() => {
        const media = window.matchMedia("(min-width: 1280px)");
        const update = () => setDesktop(media.matches);
        update();
        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        let cancelled = false;
        let latestRequest = 0;
        const update = async () => {
            const requestId = ++latestRequest;
            const token = localStorage.getItem("token");
            setAuthenticated(!!token);
            setIsAdmin(false);
            setOwned([]);
            if (!token) return;
            try {
                const user = jwtDecode<{id: string; role: string}>(token);
                setIsAdmin(user.role === "ADMIN");
                const res = await apiClient.get(`/users/public/${user.id}`);
                if (!cancelled && requestId === latestRequest) setOwned((res.data.user || res.data).owned_cosmetics || []);
            } catch { /* Expired sessions are handled by the API client. */ }
        };
        void update();
        window.addEventListener("auth-changed", update);
        window.addEventListener("profileUpdated", update);
        return () => {
            cancelled = true;
            window.removeEventListener("auth-changed", update);
            window.removeEventListener("profileUpdated", update);
        };
    }, []);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") { onClose(); setThemeOpen(false); setLanguageOpen(false); }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const navItems = [
        {key: "nav_home", icon: Compass, path: "/home"},
        {key: "nav_feed", icon: Rocket, path: "/feed"},
        {key: "nav_library", icon: Library, path: "/library"},
        {key: "nav_journal", icon: BookHeart, path: "/journal"},
        {key: "nav_rooms", icon: Radio, path: "/rooms"},
        {key: "nav_stats", icon: BarChart2, path: "/stats"},
        {key: "nav_shop", icon: ShoppingBag, path: "/shop"},
    ];
    const currentPremium = PREMIUM_THEMES.find(p => p.value === theme);
    const themeLabel = currentPremium ? t(currentPremium.labelKey, currentPremium.labelFallback) : t(theme === "light" ? "light_mode" : "dark_mode");
    const chooseTheme = (value: Theme) => { setTheme(value); setThemeOpen(false); };
    const navClass = ({isActive}: {isActive: boolean}) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-accent-soft text-accent" : "text-muted hover:bg-raised hover:text-ink"}`;

    return <>
        {isOpen && <div className="sidebar-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={onClose}/>}
        <aside ref={sidebarRef} inert={!visible} role={isOpen && !desktop ? "dialog" : undefined} aria-modal={isOpen && !desktop ? true : undefined} aria-label={t("menu_title")} className={`app-sidebar fixed top-0 left-0 h-dvh w-[248px] z-40 border-r flex flex-col transition-transform duration-200 ${visible ? "translate-x-0" : "-translate-x-full"}`}>
            <div className="h-[76px] flex items-center justify-between px-6 shrink-0">
                <NavLink to="/home" onClick={onClose} className="flex items-center gap-2.5">
                    <img src="/logo.png" alt="" className="w-9 h-9 rounded-xl"/>
                    <span className="brand-word">melodia<span className="text-accent">.</span></span>
                </NavLink>
                <button className="sidebar-close icon-button" onClick={onClose} aria-label={t("design_close")}><X size={20}/></button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                <p className="sidebar-caption">{t("design_your_space")}</p>
                {navItems.map(item => <NavLink key={item.path} to={item.path} className={navClass} onClick={onClose}>
                    <item.icon size={19} strokeWidth={1.7}/><span>{t(item.key)}</span>
                </NavLink>)}
                {authenticated && <div className="pt-6">
                    <p className="sidebar-caption">{t("design_account")}</p>
                    <NavLink to="/settings" onClick={onClose} className={navClass}><Settings size={19}/>{t("nav_settings")}</NavLink>
                    {isAdmin && <NavLink to="/admindashboard" onClick={onClose} className={navClass}><Shield size={19}/>{t("nav_admin")}</NavLink>}
                </div>}
            </nav>
            <div className="p-3 border-t border-line space-y-1">
                <div className="relative">
                    <button onClick={() => {setLanguageOpen(!languageOpen); setThemeOpen(false);}} aria-expanded={languageOpen} className="flex items-center gap-3 p-3 w-full rounded-xl text-sm text-muted hover:bg-raised">
                        <Globe size={18}/><span className="flex-1 text-left">{LANGUAGE_NAMES[i18n.resolvedLanguage || "fr"] || LANGUAGE_NAMES.fr}</span><ChevronDown size={14}/>
                    </button>
                    {languageOpen && <div className="absolute bottom-full left-0 w-full bg-panel border border-line rounded-xl p-2 shadow-xl mb-2 z-50">
                        {["fr", "en", "es", "de", "it"].map(code => <button key={code} onClick={() => {void i18n.changeLanguage(code); setLanguageOpen(false);}} className="block w-full text-left p-2 rounded-lg text-sm text-ink hover:bg-raised">{LANGUAGE_NAMES[code]}</button>)}
                    </div>}
                </div>
                <div className="relative">
                    <button onClick={() => {setThemeOpen(!themeOpen); setLanguageOpen(false);}} aria-expanded={themeOpen} className="flex items-center gap-3 p-3 w-full rounded-xl text-sm text-muted hover:bg-raised">
                        {theme === "light" ? <Sun size={18}/> : <Moon size={18}/>}<span className="flex-1 text-left">{themeLabel}</span><ChevronDown size={14}/>
                    </button>
                    {themeOpen && <div className="absolute bottom-full left-0 w-full bg-panel border border-line rounded-xl p-2 shadow-xl mb-2 z-50">
                        {(["dark", "light"] as const).map(value => <button key={value} className="block w-full text-left p-2 rounded-lg text-sm text-ink hover:bg-raised" onClick={() => chooseTheme(value)}>{t(value === "dark" ? "dark_mode" : "light_mode")}</button>)}
                        {PREMIUM_THEMES.map(pt => <button key={pt.value} className="flex items-center gap-2 w-full text-left p-2 rounded-lg text-sm text-ink hover:bg-raised" onClick={() => owned.includes(pt.cosmeticId) ? chooseTheme(pt.value) : (navigate("/shop"), onClose())}>
                            <Palette size={15}/>{t(pt.labelKey, pt.labelFallback)}{!owned.includes(pt.cosmeticId) && <ShoppingBag size={12}/>}
                        </button>)}
                    </div>}
                </div>
            </div>
        </aside>
    </>;
}
