export const mobileTabs = [
    {href: '/', icon: 'search-outline', label: 'mobile_explore'},
    {href: '/feed', icon: 'people-outline', label: 'mobile_feed'},
    {href: '/library', icon: 'albums-outline', label: 'mobile_library'},
    {href: '/stats', icon: 'stats-chart-outline', label: 'mobile_stats'},
    {href: '/profile', icon: 'person-outline', label: 'mobile_profile'},
] as const;

export function hideMobileTabs(pathname: string, keyboardOpen: boolean) {
    return keyboardOpen || ['/login', '/register', '/onboarding', '/detailsConversations', '/createplaylist', '/writereview', '/updateProfile'].includes(pathname);
}

export function activeMobileTab(pathname: string) {
    return pathname === '/playlistdetails' ? '/library' : pathname === '/statDetails' ? '/stats' : pathname;
}
