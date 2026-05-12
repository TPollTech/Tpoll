// middlewares/authMiddleware.js — protects routes that require a logged-in user
'use strict';

const { verifyUserToken } = require('../services/authService');
const { extractTokenFromRequest } = require('../controllers/authController');
const authService = require('../services/authService');

/**
 * requireAuth — blocks the request with 401 if token is missing or invalid.
 * Sets req.authUser = decoded token payload on success.
 */
function requireAuth(req, res, next) {
    const token   = extractTokenFromRequest(req);
    const payload = verifyUserToken(token);

    if (!payload) {
        return res.status(401).json({ error: 'Não autenticado. Faça login para continuar.' });
    }

    req.authUser = payload;
    return next();
}

/**
 * optionalAuth — like requireAuth but continues even without a valid token.
 * Sets req.authUser = payload or null.
 */
function optionalAuth(req, res, next) {
    const token   = extractTokenFromRequest(req);
    req.authUser  = verifyUserToken(token) || null;
    return next();
}

function requireAdminAuth(req, res, next) {
    const token = extractTokenFromRequest(req);
    const payload = verifyUserToken(token);

    if (!payload) {
        return res.status(401).json({ error: 'Não autenticado. Faça login para continuar.' });
    }

    if (!authService.isAdminEmail(payload.email)) {
        return res.status(403).json({ error: 'Acesso restrito aos administradores.' });
    }

    req.authUser = payload;
    return next();
}

module.exports = { requireAuth, optionalAuth, requireAdminAuth };
