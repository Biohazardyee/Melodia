import React, {useEffect, lazy, Suspense} from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    useNavigate, NavigateFunction,
} from "react-router-dom";
const LandingPage = lazy(() => import("./pages/LandingPage").then(module => ({default: module.LandingPage})));
import Layout from "./components/Layout";
import NotFound from "./pages/NotFound";
import LocalPerformancePanel from "./components/LocalPerformancePanel";
import {useTranslation} from "react-i18next";
const Register = lazy(() => import("./pages/Register"));
const Login = lazy(() => import("./pages/Login"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Home = lazy(() => import("./pages/Home"));
const Feed = lazy(() => import("./pages/Feed"));
const AlbumDetails = lazy(() => import("./pages/AlbumDetails"));
const Stats = lazy(() => import("./pages/Stats"));
const Library = lazy(() => import("./pages/Library"));
const Journal = lazy(() => import("./pages/Journal"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Conversations = lazy(() => import("./pages/Conversations"));
const Profil = lazy(() => import("./pages/Profil"));
const Settings = lazy(() => import("./pages/Settings"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const CreatePlaylist = lazy(() => import("./pages/CreatePlaylist"));
const Shop = lazy(() => import("./pages/Shop"));
const Rooms = lazy(() => import("./pages/Rooms"));
const RoomDetail = lazy(() => import("./pages/RoomDetail"));
import ScrollToTop from "./components/ScrollToTop";
import ThemeGuard from "./components/ThemeGuard";
import AuthGuard from "./components/AuthGuard";
const AuthRequired = lazy(() => import("./pages/AuthRequired.tsx"));
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import AdminRoute from "./components/AdminRoute.tsx"; // ✅ 1. Importation du nouveau guard admin
const AuthCallback = lazy(() => import("./pages/AuthCallback.tsx"));
import {ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AuthRedirectListener: React.FC = (): null => {
    const navigate: NavigateFunction = useNavigate();

    useEffect(() => {
        const handleUnauthorized = (): void => {
            navigate("/auth-required");
        };
        window.addEventListener("unauthorized", handleUnauthorized);
        return () => window.removeEventListener("unauthorized", handleUnauthorized);
    }, [navigate]);

    return null;
};

const App: React.FC = () => {
    const {t} = useTranslation();
    return (
        <Router>
            {import.meta.env.VITE_QA_METRICS === "true" && <LocalPerformancePanel/>}
            <AuthRedirectListener></AuthRedirectListener>
            <ThemeGuard/>
            <ScrollToTop/>
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnHover
                theme="colored"
            />
            <Suspense fallback={<div role="status" className="min-h-screen bg-canvas flex items-center justify-center text-muted"><span className="skeleton rounded-xl px-8 py-5">{t("loading")}</span></div>}>
            <Routes>
                {/* ROUTES PUBLIQUES (SANS BARRE DE NAVIGATION) */}
                <Route path="/" element={<LandingPage/>}/>
                <Route path="/register" element={<Register/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route path="/verify-email" element={<VerifyEmail/>}/>
                <Route path="/forgot-password" element={<ForgotPassword/>}/>
                <Route path="/auth/callback" element={<AuthCallback/>}/>


                {/* ROUTES AVEC LAYOUT */}
                <Route element={<Layout/>}>
                    <Route path="/album/:id" element={<AlbumDetails/>}/>
                    <Route path="*" element={<NotFound/>}/>
                    {/* Page accessible même sans connexion (ex: pour voir le message d'erreur) */}
                    <Route path="/auth-required" element={<AuthRequired/>}/>
                    <Route path="/home" element={<Home/>}/>

                    {/* --- DEBUT DES ROUTES PROTEGÉES (Utilisateurs connectés) --- */}
                    <Route element={<ProtectedRoute/>}>
                        <Route path="/feed" element={<Feed/>}/>
                        <Route path="/stats" element={<Stats/>}/>
                        <Route path="/library" element={<Library/>}/>
                        <Route path="/journal" element={<Journal/>}/>
                        <Route path="/notifications" element={<Notifications/>}/>
                        <Route path="/conversations" element={<Conversations/>}/>
                        <Route path="/profil/:id?" element={<Profil/>}/>{" "}
                        <Route path="/settings" element={<Settings/>}/>
                        <Route path="/shop" element={<Shop/>}/>
                        <Route path="/rooms" element={<Rooms/>}/>
                        <Route path="/rooms/:id" element={<RoomDetail/>}/>
                        <Route path="/create-playlist" element={<CreatePlaylist/>}/>
                        <Route path="/authguard" element={<AuthGuard/>}/>

                        {/* --- ROUTES RÉSERVÉES UNIQUEMENT AUX ADMINS --- */}
                        <Route element={<AdminRoute />}>
                            <Route path="/admindashboard" element={<AdminDashboard/>}/>
                        </Route>
                    </Route>
                    {/* --- FIN DES ROUTES PROTEGÉES --- */}
                </Route>
            </Routes>
            </Suspense>
        </Router>
    );
};

export default App;
