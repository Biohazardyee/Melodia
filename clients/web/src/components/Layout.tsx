import React, {Suspense, useState} from 'react';
import {Outlet, useLocation} from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import {Footer} from './Footer';
import {useTranslation} from 'react-i18next';

const Layout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const {t} = useTranslation();
    const isMessaging = useLocation().pathname === '/conversations';

    return (
        <div
            className="app-shell text-ink overflow-hidden">
            <a className="skip-link" href="#zone-de-scroll">{t('design_skip_content')}</a>
            <Header onMenuClick={() => setIsSidebarOpen(true)}/>
            <Sidebar persistent isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)}/>
            <main id="zone-de-scroll" tabIndex={-1} className="app-main">
                <Suspense fallback={<div role="status" className="p-8 text-muted">{t('loading')}</div>}>
                    <Outlet/>
                </Suspense>
                {!isMessaging && <Footer/>}
            </main>
        </div>
    );
};

export default Layout;
