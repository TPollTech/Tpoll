'use strict';

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'activity-log.json');
const MAX_RECORDS = 3000;

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

function writeAll(logs) {
    ensureFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(logs, null, 2), 'utf-8');
}

function append(entry) {
    const logs = readAll();
    logs.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        ts: new Date().toISOString(),
        ...entry
    });

    if (logs.length > MAX_RECORDS) {
        logs.splice(0, logs.length - MAX_RECORDS);
    }

    writeAll(logs);
}

function listRecent(limit = 200) {
    const normalized = Math.max(1, Math.min(500, Number(limit) || 200));
    const logs = readAll();
    return logs.slice(-normalized).reverse();
}

module.exports = { append, listRecent };
