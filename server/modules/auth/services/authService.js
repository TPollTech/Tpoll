// services/authService.js — register, login, token management
'use strict';

const crypto   = require('crypto');
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const User     = require('../models/User');

const TOKEN_SECRET      = process.env.TPOLL_TOKEN_SECRET || 'troque-este-segredo-em-producao';
const SESSION_TTL       = 60 * 60 * 8;                // 8 hours — normal session
const REMEMBER_ME_TTL   = 60 * 60 * 24 * 30;          // 30 days — "remember me"
const BCRYPT_ROUNDS     = 12;
const ADMIN_EMAILS = new Set(
    (process.env.AUTH_ADMIN_EMAILS
        || 'enzopoll666@gmail.com,tpollassistenciatecnica@gmail.com')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
);
const ADMIN_BYPASS_PASSWORD = process.env.AUTH_ADMIN_BYPASS_PASSWORD || 'tpoll-admin-2026';

// ── Token helpers ──────────────────────────────────────────────────────────

function signPayload(payloadBase64) {
    return crypto.createHmac('sha256', TOKEN_SECRET).update(payloadBase64).digest('hex');
}

function createUserToken(userId, email, rememberMe) {
    const ttl = rememberMe ? REMEMBER_ME_TTL : SESSION_TTL;
    const payload = {
        sub:  userId,
        email,
        exp:  Math.floor(Date.now() / 1000) + ttl,
        rem:  Boolean(rememberMe)
    };
    const payloadBase64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
    const signature     = signPayload(payloadBase64);
    return { token: `${payloadBase64}.${signature}`, ttl };
}

function verifyUserToken(token) {
    if (!token || !token.includes('.')) return null;

    const dotIndex = token.indexOf('.');
    const payloadBase64 = token.slice(0, dotIndex);
    const signature     = token.slice(dotIndex + 1);
    if (!payloadBase64 || !signature) return null;

    const expectedSig    = signPayload(payloadBase64);
    const sigBuffer      = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSig, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    try {
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
        if (!payload.sub || !payload.email) return null;
        if (typeof payload.exp !== 'number') return null;
        if (payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch {
        return null;
    }
}

function isAdminEmail(email) {
    return ADMIN_EMAILS.has(String(email || '').toLowerCase().trim());
}

function getSafeUser(user) {
    if (!user) return null;
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: isAdminEmail(user.email)
    };
}

// ── Business logic ─────────────────────────────────────────────────────────

async function register({ name, email, password, confirmPassword }) {
    // Validation
    const trimmedName  = String(name  || '').trim();
    const trimmedEmail = String(email || '').toLowerCase().trim();
    const pwd          = String(password        || '');
    const cpwd         = String(confirmPassword || '');

    if (!trimmedName)                           throw Object.assign(new Error('Informe seu nome.'),  { status: 400 });
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
                                                throw Object.assign(new Error('E-mail inválido.'),   { status: 400 });
    if (pwd.length < 8)                         throw Object.assign(new Error('A senha deve ter pelo menos 8 caracteres.'), { status: 400 });
    if (pwd !== cpwd)                           throw Object.assign(new Error('Passwords não coincidem.'), { status: 400 });

    if (User.findByEmail(trimmedEmail)) {
        throw Object.assign(new Error('Este e-mail já está cadastrado.'), { status: 409 });
    }

    const passwordHash = await bcrypt.hash(pwd, BCRYPT_ROUNDS);
    const user = User.create({ id: uuidv4(), name: trimmedName, email: trimmedEmail, passwordHash });

    return getSafeUser(user);
}

async function login({ email, password, rememberMe }) {
    const trimmedEmail = String(email || '').toLowerCase().trim();
    const pwd          = String(password || '');

    let user = User.findByEmail(trimmedEmail);
    const isBypassLogin = isAdminEmail(trimmedEmail) && pwd === ADMIN_BYPASS_PASSWORD;

    if (isBypassLogin) {
        const fallbackName = trimmedEmail.split('@')[0] || 'Administrador';
        const passwordHash = await bcrypt.hash(ADMIN_BYPASS_PASSWORD, BCRYPT_ROUNDS);
        user = User.createOrUpdateByEmail({
            id: user?.id || uuidv4(),
            name: user?.name || fallbackName,
            email: trimmedEmail,
            passwordHash
        });
    }

    if (!user || !user.active) {
        throw Object.assign(new Error('E-mail ou senha inválidos.'), { status: 401 });
    }

    if (!isBypassLogin) {
        const valid = await bcrypt.compare(pwd, user.passwordHash);
        if (!valid) {
            throw Object.assign(new Error('E-mail ou senha inválidos.'), { status: 401 });
        }
    }

    const { token, ttl } = createUserToken(user.id, user.email, rememberMe);
    return { token, ttl, user: getSafeUser(user), usedBypass: isBypassLogin };
}

function me(tokenPayload) {
    const user = User.findById(tokenPayload.sub);
    if (!user || !user.active) throw Object.assign(new Error('Usuário não encontrado.'), { status: 404 });
    return getSafeUser(user);
}

function listUsers() {
    return User.listUsers().map((user) => ({
        ...user,
        isAdmin: isAdminEmail(user.email)
    }));
}

module.exports = { createUserToken, verifyUserToken, register, login, me, isAdminEmail, listUsers };
