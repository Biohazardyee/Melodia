import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";

export function Footer() {
    const {t} = useTranslation();
    return <footer className="app-footer flex flex-wrap justify-between items-center gap-5">
        <div className="flex items-center gap-4"><span className="brand-word">melodia.</span><span>© {new Date().getFullYear()}</span></div>
        <nav aria-label={t("design_footer_nav")} className="flex flex-wrap gap-6">
            <Link className="hover:text-accent" to="/home">{t("explore_title")}</Link>
            <Link className="hover:text-accent" to="/rooms">{t("design_listen_together")}</Link>
            <Link className="hover:text-accent" to="/library">{t("design_your_space")}</Link>
        </nav>
    </footer>;
}
