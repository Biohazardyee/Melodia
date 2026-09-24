import {Link} from "react-router-dom";
import {Disc3, ArrowLeft} from "lucide-react";
import {useTranslation} from "react-i18next";

export default function NotFound() {
    const {t} = useTranslation();
    return <div className="max-w-3xl mx-auto p-8 py-24 text-center">
        <Disc3 size={56} className="text-accent mx-auto mb-8"/><p className="eyebrow">404</p>
        <h1 className="page-title my-5">{t("design_not_found")}</h1>
        <p className="text-muted mb-8">{t("design_not_found_desc")}</p>
        <Link to="/home" className="primary-action"><ArrowLeft size={18}/>{t("explore_title")}</Link>
    </div>;
}
