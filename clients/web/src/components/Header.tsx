import {Menu, MessageSquare, LogIn, Coins, UserRound} from "lucide-react";
import {NavigateFunction, useNavigate} from "react-router-dom";
import {useState, useEffect, useCallback} from "react";
import apiClient from "../api/client";
import {jwtDecode} from "jwt-decode";
import {NotificationBell} from "./NotificationBell";
import GlobalSearch from "./GlobalSearch";
import {useSocket} from "../context/SocketContext";
import {AxiosResponse} from "axios";
import AvatarBorder from "./AvatarBorder";
import {useTranslation} from "react-i18next";
import {toImageDataUri} from "../utils/imageDataUri";

type HeaderProps = {
    onMenuClick: () => void;
};

export const Header = ({onMenuClick}: HeaderProps) => {
    const navigate: NavigateFunction = useNavigate();
    const socket = useSocket();
    const {t} = useTranslation();

    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [borderId, setBorderId] = useState<string | null>(null);
    const [shopPoints, setShopPoints] = useState<number>(0);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);

    const checkUser = async (): Promise<void> => {
        const token: string | null = localStorage.getItem("token");
        setIsLoggedIn(!!token);

        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                const res: AxiosResponse = await apiClient.get(`/users/public/${decoded.id}`);
                const userData = res.data.user || res.data;

                setBorderId(userData.equipped_avatar_border ?? null);
                setShopPoints(userData.shop_points ?? 0);

                setProfilePic(toImageDataUri(userData.profile_picture));
            } catch (e) {
                console.error("Erreur fetch user header", e);
            }
        }
    };

    const fetchGlobalUnreadCount = useCallback(async (): Promise<void> => {
        const token: string | null = localStorage.getItem("token");
        if (!token) return;

        try {
            const decoded: any = jwtDecode(token);
            const uId = decoded.id || decoded.userId;

            const res: AxiosResponse = await apiClient.get(`/conversations/user/${uId}`);
            const data = res.data.conversations || [];
            // _count.messages = nombre exact de messages non lus (non envoyés par moi) par conversation
            const total = data.reduce(
                (acc: number, conv: any) => acc + (conv._count?.messages || 0),
                0,
            );
            setUnreadMessagesCount(total);
        } catch (err) {
            console.error("Erreur au calcul des non lus (Header):", err);
        }
    }, []);

    useEffect(() => {
        if (!socket) return;

        fetchGlobalUnreadCount();

        // Nouveau message reçu → recompte (badge +)
        socket.on("update_conversation_list", fetchGlobalUnreadCount);
        // Messages marqués comme lus → recompte (badge -)
        socket.on("conversation_marked_read", fetchGlobalUnreadCount);
        socket.on("conversation_updated", fetchGlobalUnreadCount);

        const handleManualReadUpdate = (): void => {
            fetchGlobalUnreadCount();
        };

        window.addEventListener("messagesRead", handleManualReadUpdate);

        return (): void => {
            socket.off("update_conversation_list", fetchGlobalUnreadCount);
            socket.off("conversation_marked_read", fetchGlobalUnreadCount);
            socket.off("conversation_updated", fetchGlobalUnreadCount);
            window.removeEventListener("messagesRead", handleManualReadUpdate);
        };
    }, [socket, fetchGlobalUnreadCount]);

    useEffect(() => {
        const handleUpdate = () => checkUser();
        checkUser();
        window.addEventListener("storage", handleUpdate);
        window.addEventListener("profileUpdated", handleUpdate);
        window.addEventListener("auth-changed", handleUpdate);
        return () => {
            window.removeEventListener("storage", handleUpdate);
            window.removeEventListener("profileUpdated", handleUpdate);
            window.removeEventListener("auth-changed", handleUpdate);
        };
    }, []);


    return (
        <header className="app-header flex items-center justify-between gap-3 shrink-0 z-20 relative">
            <div className="flex items-center gap-3">
                <button onClick={onMenuClick} className="icon-button menu-toggle" aria-label={t("menu_title")}><Menu size={22}/></button>
                <button className="header-brand" onClick={() => navigate("/home")} aria-label="Melodia">
                    <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg"/><span className="brand-word hidden sm:block">melodia.</span>
                </button>
                <span className="eyebrow hidden xl:block">{t("design_header_note")}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
                <GlobalSearch/>
                {isLoggedIn ? <>
                    <button onClick={() => navigate("/shop")} title={t("shop_points_label")} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full border border-line text-sm text-accent">
                        <Coins size={16}/>{shopPoints}
                    </button>
                    <button onClick={() => navigate("/conversations")} className="icon-button relative" aria-label={t("design_messages")}>
                        <MessageSquare size={20}/>
                        {unreadMessagesCount > 0 && <span className="absolute top-0 right-0 bg-violet-600 text-white text-[10px] min-w-4 h-4 px-1 rounded-full">{unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}</span>}
                    </button>
                    <NotificationBell/>
                    <AvatarBorder borderId={borderId} compact>
                        <button onClick={() => navigate("/profil")} aria-label={t("design_profile")} className="w-9 h-9 rounded-full overflow-hidden bg-raised flex items-center justify-center text-accent">
                            {profilePic ? <img src={profilePic} alt="" className="w-full h-full object-cover"/> : <UserRound size={18}/>}
                        </button>
                    </AvatarBorder>
                </> : <button onClick={() => navigate("/login")} aria-label={t("design_sign_in")} className="primary-action text-sm"><LogIn size={17}/><span className="hidden sm:inline">{t("design_sign_in")}</span></button>}
            </div>
        </header>
    );
};
export default Header;
