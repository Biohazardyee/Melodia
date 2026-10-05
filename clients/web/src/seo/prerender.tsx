import React from 'react';
import {renderToString} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import i18n from '../i18n';
import {LandingPage} from '../pages/LandingPage';
import Home from '../pages/Home';
import {Footer} from '../components/Footer';

export async function render(path: string) {
    await i18n.changeLanguage('fr');
    return renderToString(<MemoryRouter initialEntries={[path]}>
        {path === '/' ? <LandingPage/> : <><main><Home/></main><Footer/></>}
    </MemoryRouter>);
}
