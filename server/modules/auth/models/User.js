// models/User.js — persistent JSON-backed user store
'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'users.json');

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

function writeAll(users) {
    ensureFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

// ── Public API ─────────────────────────────────────────────────────────────

function findByEmail(email) {
    return readAll().find((u) => u.email === email.toLowerCase().trim()) || null;
}

function findById(id) {
    return readAll().find((u) => u.id === id) || null;
}

function create({ id, name, email, passwordHash }) {
    const users = readAll();
    const user = {
        id,
        name: String(name || '').trim().slice(0, 100),
        email: String(email || '').toLowerCase().trim(),
        passwordHash,
        createdAt: new Date().toISOString(),
        active: true
    };
    users.push(user);
    writeAll(users);
    return user;
}

function updatePassword(id, passwordHash) {
    const users = readAll();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return false;
    users[index].passwordHash = passwordHash;
    users[index].updatedAt = new Date().toISOString();
    writeAll(users);
    return true;
}

module.exports = { findByEmail, findById, create, updatePassword };
