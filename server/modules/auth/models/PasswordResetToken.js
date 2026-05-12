// models/PasswordResetToken.js — temporary tokens for password recovery
'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'reset-tokens.json');

function ensureFile() {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
}

function readAll() {
    ensureFile();
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8').replace(/^\uFEFF/, '');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeAll(tokens) {
    ensureFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

// Purge records that have already expired (housekeeping)
function purgeExpired() {
    const now = Date.now();
    const tokens = readAll().filter((t) => t.expiresAt > now);
    writeAll(tokens);
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Create a reset token for a user.
 * Removes any previous tokens for the same userId first.
 */
function create(userId, tokenHash) {
    purgeExpired();
    const tokens = readAll().filter((t) => t.userId !== userId);
    const record = {
        userId,
        tokenHash,
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
        createdAt: new Date().toISOString()
    };
    tokens.push(record);
    writeAll(tokens);
    return record;
}

/** Find a valid (non-expired) token record by its hash. */
function findValid(tokenHash) {
    purgeExpired();
    return readAll().find((t) => t.tokenHash === tokenHash && t.expiresAt > Date.now()) || null;
}

/** Consume (delete) a token after use. */
function remove(tokenHash) {
    const tokens = readAll().filter((t) => t.tokenHash !== tokenHash);
    writeAll(tokens);
}

module.exports = { create, findValid, remove };
