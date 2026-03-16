// ACE Panel Configuration (same API/WS as full dashboard)
const ACE_DASHBOARD_CONFIG = {
    apiBase: window.location.origin,
    wsBase: null,
    autoRefreshInterval: 5000,
    wsReconnectTimeout: 3000,
    debug: false,
    defaults: {
        feedLength: 50,
        feedSpeed: 25,
        retractLength: 50,
        retractSpeed: 25,
        dryingTemp: 50,
        dryingDuration: 240
    }
};

function getWebSocketUrl() {
    if (ACE_DASHBOARD_CONFIG.wsBase) return ACE_DASHBOARD_CONFIG.wsBase;
    const apiBase = ACE_DASHBOARD_CONFIG.apiBase;
    if (apiBase.startsWith('https://')) return apiBase.replace('https://', 'wss://') + '/websocket';
    if (apiBase.startsWith('http://')) return apiBase.replace('http://', 'ws://') + '/websocket';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/websocket`;
}
