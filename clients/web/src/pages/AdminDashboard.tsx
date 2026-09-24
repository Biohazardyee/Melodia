import React, {useState, useEffect} from 'react';
import {
    Users, FileText, AlertTriangle, Search,
    ShieldAlert, Ban, Activity, Check, Trash2, Filter
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Link, NavigateFunction, useNavigate} from 'react-router-dom';
import {toast} from 'react-toastify';
import apiClient from '../api/client';
import {useConfirm} from '../context/ConfirmContext';
import UserAvatar from "../components/UserAvatar.tsx";
import StatCard from "../components/StatCard.tsx";
import {Report} from "../../../../backend/types/reports/report.dto.ts"
import {BannedUserResponseDto} from "../../../../backend/types/users/banned.user.dto.ts";
import {AxiosResponse} from "axios";

type AdminTab = 'users' | 'reports' | 'analytics';

interface AdminStats {
    totalUsers: number;
    bannedUsers: number;
    reviews: number;
    reports: number;
}

const AdminDashboard: React.FC = () => {
    const navigate: NavigateFunction = useNavigate();
    const {t} = useTranslation();
    const confirm = useConfirm();

    const [activeTab, setActiveTab] = useState<AdminTab>('reports');
    const [reports, setReports] = useState<Report[]>([]);
    const [bannedUsers, setBannedUsers] = useState<BannedUserResponseDto[]>([]);
    const [stats, setStats] = useState<AdminStats>({totalUsers: 0, bannedUsers: 0, reviews: 0, reports: 0});
    const [loading, setLoading] = useState<boolean>(true);

    const [reportFilter, setReportFilter] = useState<'all' | 'profile' | 'comment' | 'review'>('all');
    const [userSearch, setUserSearch] = useState<string>('');

    useEffect((): void => {
        const fetchDashboardData = async (): Promise<void> => {
            try {
                setLoading(true);

                const [reportsRes, usersRes, reviewsRes, bansRes] = await Promise.all([
                    apiClient.get('/reports').catch(() => ({data: {reports: []}})),
                    apiClient.get('/users').catch(() => ({data: {users: []}})),
                    apiClient.get('/reviews').catch(() => ({data: {reviews: []}})),
                    apiClient.get('/bans').catch(() => ({data: {bannedUsers: []}}))
                ]);

                const fetchedReports = reportsRes.data?.reports || (Array.isArray(reportsRes.data) ? reportsRes.data : []);
                const fetchedBannedUsers = bansRes.data?.bannedUsers || (Array.isArray(bansRes.data) ? bansRes.data : []);

                const totalUsers = usersRes.data?.users?.length || (Array.isArray(usersRes.data) ? usersRes.data.length : 0);
                const totalReviews = reviewsRes.data?.reviews?.length || (Array.isArray(reviewsRes.data) ? reviewsRes.data.length : 0);

                setReports(fetchedReports);
                setBannedUsers(fetchedBannedUsers);

                setStats({
                    totalUsers: totalUsers,
                    bannedUsers: fetchedBannedUsers.length,
                    reviews: totalReviews,
                    reports: fetchedReports.filter((r: Report) => !r.is_checked).length,
                });

            } catch (error) {
                console.error("Erreur lors de la récupération des données d'administration :", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleBanUserFromReport = async (report: Report): Promise<void> => {
        let targetUserId: string | null | undefined = report.profile_id ||
            report.review?.user_id || report.comment?.user_id;

        if (!targetUserId && report.reason_type === 'review' && report.review_id) {
            try {
                const reviewRes: AxiosResponse = await apiClient.get(`/reviews/${report.review_id}`);
                targetUserId = reviewRes.data?.review?.user_id || reviewRes.data?.user_id;
            } catch (err) {
                console.error("Erreur lors de la récupération des détails de la review:", err);
            }
        }

        if (!targetUserId && report.reason_type === 'comment' && report.comment_id) {
            try {
                const commentRes: AxiosResponse = await apiClient.get(`/review-comments/${report.comment_id}`);
                targetUserId = commentRes.data?.reviewComment?.user_id || commentRes.data?.comment?.user_id || commentRes.data?.user_id;
            } catch (err) {
                console.error("Erreur lors de la récupération des détails du commentaire:", err);
            }
        }

        if (!targetUserId) {
            toast.error(t('alert_user_not_found', "Impossible de récupérer automatiquement l'identifiant de l'auteur de ce contenu."));
            return;
        }

        const banReason: string | null = window.prompt(
            t('prompt_ban_reason', "Veuillez saisir le motif du bannissement :"),
            `${t('prompt_ban_reason_prefix', 'Suite au signalement : ')}${report.reason}`
        );
        if (banReason === null) return;

        try {
            const relatedReports: Report[] = [];

            await Promise.all(
                reports.map(async (r): Promise<void> => {
                    if (r.id === report.id || r.profile_id === targetUserId) {
                        relatedReports.push(r);
                        return;
                    }

                    if (r.reason_type === 'review' && r.review_id) {
                        let authorId: string | undefined = r.review?.user_id;
                        if (!authorId) {
                            try {
                                const res: AxiosResponse<any, any> = await apiClient.get(`/reviews/${r.review_id}`);
                                authorId = res.data?.review?.user_id || res.data?.user_id;
                            } catch (err) {
                                console.warn(`Review ${r.review_id} déjà supprimée ou inaccessible.`);
                            }
                        }
                        if (authorId === targetUserId) relatedReports.push(r);
                        return;
                    }

                    if (r.reason_type === 'comment' && r.comment_id) {
                        let authorId: string | undefined = r.comment?.user_id;
                        if (!authorId) {
                            try {
                                const res: AxiosResponse<any, any> = await apiClient.get(`/review-comments/${r.comment_id}`);
                                authorId = res.data?.reviewComment?.user_id || res.data?.comment?.user_id || res.data?.user_id;
                            } catch (err) {
                                console.warn(`Commentaire ${r.comment_id} déjà supprimé ou inaccessible.`);
                            }
                        }
                        if (authorId === targetUserId) relatedReports.push(r);
                        return;
                    }
                })
            );

            await apiClient.post('/bans', {user_id: targetUserId, content: banReason});

            await Promise.all(
                relatedReports.map(r =>
                    apiClient.delete(`/reports/${r.id}`).catch(err => console.warn(`Le report ${r.id} est déjà supprimé.`, err))
                )
            );

            const [reportsRes, bansRes] = await Promise.all([
                apiClient.get('/reports').catch(() => ({data: {reports: []}})),
                apiClient.get('/bans').catch(() => ({data: {bannedUsers: []}}))
            ]);

            const fetchedReports = reportsRes.data?.reports || (Array.isArray(reportsRes.data) ? reportsRes.data : []);
            const fetchedBannedUsers = bansRes.data?.bannedUsers || (Array.isArray(bansRes.data) ? bansRes.data : []);

            setReports(fetchedReports);
            setBannedUsers(fetchedBannedUsers);

            const pendingCount = fetchedReports.filter((r: Report) => !r.is_checked).length;

            setStats(prev => ({
                ...prev,
                bannedUsers: fetchedBannedUsers.length,
                reports: pendingCount
            }));

            toast.success(t('alert_ban_success', "L'utilisateur a été banni avec succès et tous les signalements le concernant ont été clôturés."));
        } catch (error) {
            console.error("Erreur lors du bannissement de l'utilisateur :", error);
            toast.error(t('alert_ban_error', "Une erreur est survenue lors du bannissement."));
        }
    };

    const handleCheckContent = (report: Report): void => {
        if (report.reason_type === 'profile' && report.profile_id) {
            navigate(`/profil/${report.profile_id}`);
        }
    };

    const handleUnbanUser = async (banId: string): Promise<void> => {
        const ok = await confirm({
            title: t('unban_title', "Débannir l'utilisateur"),
            message: t('confirm_unban', "Êtes-vous sûr de vouloir débannir cet utilisateur ?"),
            confirmText: t('unban', "Débannir"),
        });
        if (!ok) return;

        try {
            await apiClient.delete(`/bans/${banId}`);

            setBannedUsers(prev => prev.filter(b => b.id !== banId));
            setStats(prev => ({
                ...prev,
                bannedUsers: Math.max(0, prev.bannedUsers - 1)
            }));

            toast.success(t('alert_unban_success', "L'utilisateur a été débanni avec succès."));
        } catch (error) {
            console.error("Erreur lors du débannissement :", error);
            toast.error(t('alert_unban_error', "Impossible de débannir l'utilisateur."));
        }
    };

    const handleRejectReport = async (reportId: string): Promise<void> => {
        const ok = await confirm({
            title: t('reject_report_title', "Rejeter le signalement"),
            message: t('confirm_reject_report', "Êtes-vous sûr de vouloir rejeter et supprimer ce signalement sans prendre de mesure ?"),
            confirmText: t('reject', "Rejeter"),
            danger: true,
        });
        if (!ok) return;

        try {
            await apiClient.delete(`/reports/${reportId}`);
            setReports(prev => prev.filter(r => r.id !== reportId));
            setStats(prev => ({...prev, reports: Math.max(0, prev.reports - 1)}));

        } catch (error) {
            console.error("Erreur lors de la suppression du signalement :", error);
        }
    };

    const tabs = [
        {id: 'reports', label: t('tab_reports', 'Signalements')},
        {id: 'users', label: t('banned_users_btn', 'Utilisateurs Bannis')},
        {id: 'analytics', label: t('tab_analytics', 'Analytiques')}
    ] as const;

    const pendingReportsCount: number = reports.filter(r => !r.is_checked).length;

    const displayedReports: Report[] = reports.filter(report =>
        reportFilter === 'all' ? true : report.reason_type === reportFilter
    );

    const displayedBannedUsers: BannedUserResponseDto[] = bannedUsers.filter(user => {
        const searchLower: string = userSearch.toLowerCase();
        return (
            (user.username?.toLowerCase() || '').includes(searchLower) ||
            (user.email?.toLowerCase() || '').includes(searchLower) ||
            (user.content?.toLowerCase() || '').includes(searchLower)
        );
    });

    return (
        <div
            className="min-h-screen bg-canvas dark:bg-canvas text-ink p-6 md:p-10 font-sans transition-colors duration-300">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* En-tête du Dashboard */}
                <header className="flex items-start gap-4">
                    <div className="p-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl">
                        <ShieldAlert size={28}/>
                    </div>
                    <div>
                        <h1 className="page-title text-4xl font-bold text-ink tracking-tight"
                            >
                            {t('admin_dashboard_title', "Panneau d'Administration")}
                        </h1>
                        <p className="text-slate-500 dark:text-muted text-lg mt-1 font-medium">{t('admin_subtitle', 'Gérez les utilisateurs et le contenu')}</p>
                    </div>
                </header>

                {/* Cartes statistiques */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon={Users} value={stats.totalUsers} label={t('stat_users', 'Utilisateurs')}
                              badge={t('badge_total', 'Total')}/>
                    <StatCard icon={Ban} value={stats.bannedUsers} label={t('banned_users_btn', 'Utilisateurs Bannis')}
                              badge={t('badge_total', 'Total')}/>
                    <StatCard icon={FileText} value={stats.reviews} label={t('stat_reviews', 'Avis')}
                              badge={t('badge_total', 'Total')}/>
                    <StatCard icon={AlertTriangle} value={pendingReportsCount} label={t('stat_reports', 'Signalements')}
                              badge={t('badge_urgent', 'Urgent')} isUrgent={pendingReportsCount > 0}/>
                </div>

                {/* Barre de navigation des onglets */}
                <nav
                    className="bg-panel/50 dark:bg-panel border border-line dark:border-line rounded-2xl p-1.5 flex gap-2 shadow-inner">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                                activeTab === tab.id
                                    ? 'bg-raised dark:bg-raised text-ink shadow-md'
                                    : 'text-muted dark:text-muted hover:text-white dark:hover:text-gray-900 hover:bg-raised/30 dark:hover:bg-gray-50'
                            }`}
                        >
                            {tab.label}
                            {tab.id === 'reports' && pendingReportsCount > 0 && (
                                <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">
                        {pendingReportsCount}
                      </span>
                            )}
                        </button>
                    ))}
                </nav>

                {loading ? (
                    <div
                        className="text-center py-20 text-muted">{t('loading_db_data', 'Chargement des données de la base de données...')}</div>
                ) : (
                    <div className="space-y-6">

                        {activeTab === 'users' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="relative flex-1 group">
                                        <Search
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-muted group-focus-within:text-blue-500 transition-colors"
                                            size={20}/>
                                        <input
                                            type="text"
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            placeholder={t('search_banned_placeholder', 'Rechercher un utilisateur banni (pseudo, email, raison)...')}
                                            className="w-full bg-panel dark:bg-panel border border-line dark:border-line rounded-xl py-3.5 pl-12 pr-4 text-sm text-ink focus:outline-none focus:border-blue-500/50 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                {displayedBannedUsers.length === 0 ? (
                                    <div
                                        className="text-center py-12 text-slate-500 bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl">
                                        {t('no_banned_users_found', 'Aucun utilisateur banni trouvé.')}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {displayedBannedUsers.map((banned) => (
                                            <div key={banned.id}
                                                 className="bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl overflow-hidden shadow-xl p-6 flex flex-col justify-between gap-4 transition-all border-l-4 border-l-rose-600/70">
                                                <div>
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <Link
                                                            to={`/profil/${banned.user_id}`}
                                                            className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 font-bold text-lg hover:opacity-80 transition-opacity cursor-pointer"
                                                            title="Voir le profil"
                                                        >
                                                            <UserAvatar
                                                                userId={banned.user_id}
                                                                username={banned.username}
                                                                sizeClass="w-10 h-10 text-sm"
                                                            />
                                                        </Link>
                                                        <div>
                                                            <Link to={`/profil/${banned.user_id}`}
                                                                  className="hover:underline decoration-blue-500">
                                                                <h3 className="text-lg font-bold text-ink hover:text-blue-500 transition-colors">
                                                                    @{banned.username}
                                                                </h3>
                                                            </Link>
                                                            <p className="text-slate-500 dark:text-muted text-xs">{banned.email}</p>
                                                        </div>
                                                    </div>
                                                    <div
                                                        className="bg-canvas dark:bg-canvas border border-line dark:border-line rounded-xl p-4">
                                      <span
                                          className="text-[10px] font-bold text-slate-500 dark:text-muted uppercase tracking-wider block mb-1">
                                        {t('ban_reason_label', 'Raison du bannissement :')}
                                      </span>
                                                        <p className="text-sm text-slate-300 dark:text-gray-700 italic">"{banned.content}"</p>
                                                    </div>
                                                </div>
                                                <div
                                                    className="flex justify-end border-t border-line dark:border-gray-100 pt-3 mt-2">
                                                    <button
                                                        onClick={() => handleUnbanUser(banned.id)}
                                                        className="flex items-center gap-1.5 bg-raised hover:bg-slate-700 dark:bg-raised dark:hover:bg-gray-200 text-slate-200 dark:text-gray-700 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        <Check size={14}
                                                               className="text-emerald-500"/> {t('unban_user_btn', 'Réhabiliter / Débannir')}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'reports' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div
                                    className="flex justify-between items-center bg-panel dark:bg-panel border border-line dark:border-line rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center gap-2 text-ink font-medium">
                                        <Filter size={18} className="text-slate-500 dark:text-muted"/>
                                        {t('filter_type_label', 'Filtrer par type :')}
                                    </div>
                                    <select
                                        value={reportFilter}
                                        onChange={(e) => setReportFilter(e.target.value as any)}
                                        className="bg-canvas dark:bg-canvas border border-line dark:border-line text-ink text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                                    >
                                        <option value="all">{t('filter_all_reports', 'Tous les signalements')}</option>
                                        <option
                                            value="profile">{t('filter_user_profiles', 'Profils utilisateurs')}</option>
                                        <option value="comment">{t('filter_comments', 'Commentaires')}</option>
                                        <option value="review">{t('filter_reviews', 'Reviews')}</option>
                                    </select>
                                </div>

                                {displayedReports.length === 0 ? (
                                    <div
                                        className="text-center py-10 text-slate-500 bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl">
                                        {t('no_reports_filtered', 'Aucun signalement trouvé pour ce filtre.')}
                                    </div>
                                ) : (
                                    displayedReports.map((report) => (
                                        <div key={report.id}
                                             className="bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl p-6 shadow-lg border-l-4 border-l-rose-500">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 rounded-full bg-rose-500/10 text-rose-500">
                                                        <AlertTriangle size={20}/>
                                                    </div>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <h3 className="text-sm font-mono text-muted">
                                                                {t('report_number', {id: report.id.substring(0, 8)})}...
                                                            </h3>
                                                            <span
                                                                className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-rose-500 text-white">
                                          {t('status_pending', 'En attente')}
                                        </span>
                                                            <span
                                                                className="bg-raised dark:bg-raised text-slate-300 dark:text-muted text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                          {t('type_label', 'Type:')} {report.reason_type === 'profile' ?
                                                                t('type_profile', 'Profil') : report.reason_type === 'review' ? t('type_review', 'Avis') : t('type_comment', 'Commentaire')}
                                        </span>
                                                        </div>
                                                        <p className="text-slate-500 dark:text-muted text-xs">
                                                            {t('reported_by', 'Signalé par')}{' '}
                                                            <span
                                                                className="text-slate-300 dark:text-gray-800 font-medium">
                                          {report.reporter?.username || `ID: ${report.reporter_id.substring(0, 8)}`}
                                        </span>{' '}
                                                            • {new Date(report.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className="bg-canvas dark:bg-canvas border border-line dark:border-line rounded-xl p-4 mb-6">
                                                <p className="text-sm text-slate-300 dark:text-gray-700 mb-2 font-medium">
                                                    <strong
                                                        className="text-ink">{t('target_label', 'Cible :')}</strong>{' '}
                                                    {report.reason_type === 'profile' ? (
                                                        report.profile?.username
                                                            ? `@${report.profile.username} (ID: ${report.profile_id?.substring(0, 8)})`
                                                            : `${t('type_profile', 'Profil')} (ID: ${report.profile_id?.substring(0, 8)})`
                                                    ) : report.reason_type === 'review' ? (
                                                        `${t('type_review', 'Review')} (ID: ${report.review_id?.substring(0, 8)})`
                                                    ) : (
                                                        `${t('type_comment', 'Commentaire')} (ID: ${report.comment_id?.substring(0, 8)})`
                                                    )}
                                                </p>
                                                <p className="text-sm text-slate-300 dark:text-gray-700 font-medium">
                                                    <strong
                                                        className="text-ink">{t('reason', 'Motif')} :</strong> {report.reason}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-3">
                                                {report.reason_type === 'profile' && (
                                                    <button
                                                        onClick={() => handleCheckContent(report)}
                                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm"
                                                    >
                                                        {t('check_content', 'Vérifier le contenu')}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleBanUserFromReport(report)}
                                                    className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 ml-auto"
                                                >
                                                    <Ban size={14}/> {t('ban_user', "Bannir l'utilisateur")}
                                                </button>

                                                <button
                                                    onClick={() => handleRejectReport(report.id)}
                                                    className="bg-raised hover:bg-slate-700 dark:bg-gray-200 dark:hover:bg-gray-300 text-slate-300 dark:text-gray-700 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                                >
                                                    <Trash2
                                                        size={12}/> {t('reject_report_btn', 'Rejeter la demande (Ignorer)')}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'analytics' && (
                            <div
                                className="bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl p-20 text-center animate-in fade-in duration-300">
                                <Activity size={48}
                                          className="mx-auto text-slate-700 dark:text-gray-300 mb-4 opacity-50"/>
                                <h2 className="text-xl font-bold text-slate-500 dark:text-muted">{t('analytics_soon', 'Analyses sera bientôt disponible...')}</h2>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default AdminDashboard;
