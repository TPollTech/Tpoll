'use strict';

const ActivityLog = require('../models/ActivityLog');

function extractIp(req) {
    return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
        .split(',')[0]
        .trim()
        .replace('::ffff:', '');
}

function extractUserAgent(req) {
    return String(req.headers['user-agent'] || '').slice(0, 300);
}

function logEvent(type, req, extra = {}) {
    ActivityLog.append({
        type,
        ip: extractIp(req),
        userAgent: extractUserAgent(req),
        path: String(req.path || req.originalUrl || '').slice(0, 220),
        ...extra
    });
}

function shouldTrackVisit(req) {
    if (req.method !== 'GET') return false;

    const urlPath = String(req.path || '').toLowerCase();
    if (!urlPath) return false;

    if (urlPath.startsWith('/api/') || urlPath.startsWith('/auth/')) return false;
    if (urlPath.startsWith('/assets/')) return false;
    if (urlPath.startsWith('/node_modules/')) return false;

    return !/\.(css|js|png|jpe?g|gif|svg|ico|webp|json|map|txt|woff2?|ttf)$/i.test(urlPath);
}

function trackVisit(req, authUser) {
    if (!shouldTrackVisit(req)) return;
    logEvent('visit', req, {
        email: authUser?.email || null,
        userId: authUser?.sub || null,
        page: String(req.path || '/').slice(0, 220)
    });
}

function listRecent(limit) {
    return ActivityLog.listRecent(limit);
}

module.exports = {
    logEvent,
    trackVisit,
    listRecent,
    extractIp
};
