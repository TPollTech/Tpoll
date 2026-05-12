// services/passwordResetService.js — forgot-password / reset-password flow
'use strict';

const crypto               = require('crypto');
const bcrypt               = require('bcryptjs');
const User                 = require('../models/User');
const PasswordResetToken   = require('../models/PasswordResetToken');
const emailService         = require('./emailService');

const APP_URL      = process.env.APP_URL      || 'http://localhost:5500';
const BCRYPT_ROUNDS = 12;

/**
 * Initiate password reset.
 * Always returns silently — never reveals whether the email exists.
 */
async function forgotPassword(email) {
    const trimmedEmail = String(email || '').toLowerCase().trim();

    const user = User.findByEmail(trimmedEmail);
    if (!user || !user.active) return; // silent — no leak

    // Generate cryptographically random token
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    PasswordResetToken.create(user.id, tokenHash);

    const resetLink = `${APP_URL}/redefinir-senha?token=${rawToken}`;

    // Fire-and-forget — failures are logged but not surfaced to caller
    emailService.sendPasswordResetEmail(user.email, resetLink).catch((err) => {
        console.error('[passwordResetService] Falha ao enviar e-mail:', err.message);
    });
}

/**
 * Complete password reset.
 * @param {string} rawToken - token from query string (not hashed)
 * @param {string} password
 * @param {string} confirmPassword
 */
async function resetPassword(rawToken, password, confirmPassword) {
    const pwd  = String(password        || '');
    const cpwd = String(confirmPassword || '');

    if (pwd.length < 8) {
        throw Object.assign(new Error('A senha deve ter pelo menos 8 caracteres.'), { status: 400 });
    }
    if (pwd !== cpwd) {
        throw Object.assign(new Error('As senhas não coincidem.'), { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(String(rawToken)).digest('hex');
    const record    = PasswordResetToken.findValid(tokenHash);

    if (!record) {
        throw Object.assign(new Error('Link inválido ou expirado.'), { status: 400 });
    }

    const passwordHash = await bcrypt.hash(pwd, BCRYPT_ROUNDS);
    User.updatePassword(record.userId, passwordHash);
    PasswordResetToken.remove(tokenHash);
}

module.exports = { forgotPassword, resetPassword };
