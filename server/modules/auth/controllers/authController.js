// controllers/authController.js — HTTP request handlers for auth routes
'use strict';

const authService          = require('../services/authService');
const passwordResetService = require('../services/passwordResetService');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const COOKIE_NAME   = 'tpoll_auth_token';

function cookieOptions(ttl) {
    return [
        `HttpOnly`,
        `SameSite=Strict`,
        `Path=/`,
        IS_PRODUCTION ? `Secure` : '',
        ttl ? `Max-Age=${ttl}` : ''       // no Max-Age = session cookie
    ].filter(Boolean).join('; ');
}

function setAuthCookie(res, token, ttl) {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; ${cookieOptions(ttl)}`);
}

function clearAuthCookie(res) {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

function parseCookies(req) {
    const header = req.headers.cookie;
    if (!header) return {};
    return header.split(';').reduce((acc, part) => {
        const idx = part.indexOf('=');
        if (idx < 0) return acc;
        acc[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
        return acc;
    }, {});
}

// ── Handlers ───────────────────────────────────────────────────────────────

async function register(req, res) {
    try {
        const user = await authService.register(req.body || {});
        res.status(201).json({ ok: true, user });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
}

async function login(req, res) {
    try {
        const { email, password, rememberMe } = req.body || {};
        const { token, ttl, user } = await authService.login({ email, password, rememberMe });

        setAuthCookie(res, token, rememberMe ? ttl : null);
        res.json({ ok: true, user });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
}

async function logout(req, res) {
    clearAuthCookie(res);
    res.json({ ok: true });
}

async function me(req, res) {
    try {
        const user = authService.me(req.authUser);
        res.json({ ok: true, user });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
}

async function forgotPassword(req, res) {
    try {
        const { email } = req.body || {};
        await passwordResetService.forgotPassword(email);
        // Always the same response — never reveals if email exists
        res.json({
            ok: true,
            message: 'Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.'
        });
    } catch (err) {
        console.error('[authController] forgotPassword error:', err.message);
        res.json({
            ok: true,
            message: 'Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.'
        });
    }
}

async function resetPassword(req, res) {
    try {
        const { token, password, confirmPassword } = req.body || {};
        await passwordResetService.resetPassword(token, password, confirmPassword);
        res.json({ ok: true, message: 'Senha redefinida com sucesso. Faça login novamente.' });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
}

// ── Token reading helper (used by middleware) ──────────────────────────────

function extractTokenFromRequest(req) {
    const cookies = parseCookies(req);
    return cookies[COOKIE_NAME] || null;
}

module.exports = {
    register,
    login,
    logout,
    me,
    forgotPassword,
    resetPassword,
    extractTokenFromRequest
};
