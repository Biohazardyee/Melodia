import {
    Award,
    Heart,
    ListMusic,
    Lock,
    MessageSquare,
    PenLine,
    UserPlus,
    Users
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
const BADGE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    PenLine,
    Users,
    UserPlus,
    MessageSquare,
    ListMusic,
    Heart,
};

interface Props {
    badges: any[];
}

export default function ProfileBadges({ badges }: Props) {
    const { t } = useTranslation();
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {badges.map((badge) => {
                const Icon = BADGE_ICONS[badge.icon] || Award;
                const progressPct: number = Math.min(
                    100,
                    Math.round((badge.progress / badge.threshold) * 100),
                );

                return (
                    <div
                        key={badge.id}
                        className={`relative flex items-start gap-4 p-5 rounded-2xl border transition-all ${badge.unlocked
                                ? "bg-amber-500/5 border-amber-500/30"
                                : "bg-panel dark:bg-panel border-line dark:border-line opacity-70"
                            }`}
                    >
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${badge.unlocked
                                    ? "bg-amber-500/15 text-amber-400"
                                    : "bg-raised dark:bg-raised text-slate-500"
                                }`}
                        >
                            {badge.unlocked ? <Icon size={22} /> : <Lock size={20} />}
                        </div>
                        <div className="min-w-0 grow">
                            <p className="font-bold text-ink">
                                {badge.name}
                            </p>
                            <p className="text-xs text-muted dark:text-muted mt-0.5">
                                {badge.description}
                            </p>
                            {!badge.unlocked && (
                                <div className="mt-2.5 space-y-1">
                                    <div className="h-1.5 rounded-full bg-raised dark:bg-gray-200 overflow-hidden">
                                        <div
                                            className="h-full bg-amber-500/70 rounded-full transition-all"
                                            style={{ width: `${progressPct}%` }}
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-muted">
                                        {badge.progress}/{badge.threshold}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {badges.length === 0 && (
                <p className="text-slate-500 font-medium py-12 text-center col-span-full">
                    {t("badges_loading", "Chargement des badges...")}
                </p>
            )}
        </div>
    );
}
