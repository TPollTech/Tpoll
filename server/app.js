const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync, exec } = require('child_process');
const compression = require('compression');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const sharp = require('sharp');
const authRoutes = require('./modules/auth/routes/authRoutes');
const { verifyUserToken } = require('./modules/auth/services/authService');
const activityService = require('./modules/auth/services/activityService');

const app = express();

const PORT = Number(process.env.PORT || 5500);
const DATA_FILE = path.join(__dirname, 'store-data.json');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const TOKEN_SECRET = process.env.TPOLL_TOKEN_SECRET || (IS_PRODUCTION ? '' : 'troque-este-segredo-em-producao');
const TOKEN_TTL_SECONDS = 60 * 60 * 8;
const GITHUB_REPO = 'TPollTech/Tpoll';
const GITHUB_DATA_PATH = 'server/store-data.json';
const GITHUB_BRANCH = 'main';

const ADMIN_AUTH_FILE = path.join(__dirname, 'admin-auth.json');
const ADMIN_SESSIONS_FILE = path.join(__dirname, 'admin-sessions.json');
const ADMIN_LOGS_FILE = path.join(__dirname, 'admin-logs.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'products');
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const DEFAULT_ADMIN_PIN = process.env.TPOLL_ADMIN_PIN || '240726';
const BCRYPT_ROUNDS = 12;

if (IS_PRODUCTION && (!TOKEN_SECRET || TOKEN_SECRET.length < 32)) {
  console.warn('TPOLL_TOKEN_SECRET não definido — gerando automaticamente (válido apenas durante esta sessão).');
}

// Generate a runtime secret if none provided (survives until restart)
const effectiveTokenSecret = (TOKEN_SECRET && TOKEN_SECRET.length >= 32)
  ? TOKEN_SECRET
  : crypto.randomBytes(48).toString('hex');

const rateLimitState = new Map();

const defaultProducts = [
  {
    id: crypto.randomUUID(),
    name: 'Cabo USB-C Turbo',
    category: 'Acess\u00f3rios',
    description: 'Cabo refor\u00e7ado com carregamento r\u00e1pido.',
    price: 39.9,
    promoPrice: 29.9,
    onSale: true,
    stock: 12,
    image: '',
    active: true,
    featured: false
  },
  {
    id: crypto.randomUUID(),
    name: 'Pel\u00edcula 3D Premium',
    category: 'Prote\u00e7\u00e3o',
    description: 'Pel\u00edcula resistente para celulares.',
    price: 45,
    promoPrice: 0,
    onSale: false,
    stock: 20,
    image: '',
    active: true,
    featured: false
  }
];

function ensureDataFile() {
  if (fs.existsSync(DATA_FILE)) return;
  // In production, try to fetch from GitHub first
  if (IS_PRODUCTION) {
    try {
      const { execSync } = require('child_process');
      const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_DATA_PATH}?ref=${GITHUB_BRANCH}`;
      const result = execSync(`curl -s "${url}"`, { timeout: 15000, encoding: 'utf-8' });
      const json = JSON.parse(result);
      if (json.content) {
        const content = Buffer.from(json.content, 'base64').toString('utf-8');
        fs.writeFileSync(DATA_FILE, content, 'utf-8');
        console.log('store-data.json fetched from GitHub');
        return;
      }
    } catch (err) {
      console.warn('Failed to fetch from GitHub, using defaults:', err.message);
    }
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(defaultProducts, null, 2), 'utf-8');
}

function gitPushAsync(message) {
  if (!IS_PRODUCTION) return;
  const siteDir = path.join(__dirname, '..');
  exec(`git add ${DATA_FILE}`, { cwd: siteDir, timeout: 10000 }, () => {
    exec(`git commit -m "${message}"`, { cwd: siteDir, timeout: 10000, stdio: 'pipe' }, (err) => {
      if (err) return; // nothing to commit
      exec('git push', { cwd: siteDir, timeout: 30000, stdio: 'pipe' }, () => {});
    });
  });
}

function readProducts() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...defaultProducts];
    return parsed;
  } catch {
    return [...defaultProducts];
  }
}

function saveProducts(products) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), 'utf-8');
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if (index < 0) return acc;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function cleanText(value, maxLength) {
  const sanitized = String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
  return sanitized.slice(0, maxLength);
}

function normalizeImageUrl(value) {
  const image = cleanText(value, 300);
  if (!image) return '';

  const hasUnsafeChars = /["'<>\\]/.test(image);
  if (hasUnsafeChars) return '';

  const isAllowedRelative = image.startsWith('assets/') || image.startsWith('/assets/') || image.startsWith('./assets/') ||
    image.startsWith('uploads/') || image.startsWith('/uploads/') || image.startsWith('./uploads/');
  const isAllowedAbsolute = image.startsWith('https://') || image.startsWith('http://');

  return isAllowedRelative || isAllowedAbsolute ? image : '';
}

function enforceRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const current = rateLimitState.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitState.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count += 1;
  return true;
}

function signPayload(payloadBase64) {
  return crypto.createHmac('sha256', effectiveTokenSecret).update(payloadBase64).digest('hex');
}

function createAdminToken() {
  const payload = {
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

function verifyAdminToken(token) {
  if (!token || !token.includes('.')) return false;

  const [payloadBase64, signature] = token.split('.');
  if (!payloadBase64 || !signature) return false;

  const expectedSignature = signPayload(payloadBase64);
  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (signatureBuffer.length !== expectedBuffer.length) return false;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
    if (payload.role !== 'admin') return false;
    if (typeof payload.exp !== 'number') return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

function isLocalRequest(req) {
  const forwarded = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  const remote = (forwarded || req.socket.remoteAddress || '').replace('::ffff:', '');
  return remote === '127.0.0.1' || remote === '::1' || remote === 'localhost';
}

function isSameOriginRequest(req) {
  const host = String(req.headers.host || '').toLowerCase();
  if (!host) return false;

  const origin = String(req.headers.origin || '').trim();
  const referer = String(req.headers.referer || '').trim();

  const extractHost = (value) => {
    if (!value) return '';
    try {
      return new URL(value).host.toLowerCase();
    } catch {
      return '';
    }
  };

  if (origin) {
    return extractHost(origin) === host;
  }

  if (referer) {
    return extractHost(referer) === host;
  }

  return true;
}

function requireSameOrigin(req, res, next) {
  if (!isSameOriginRequest(req)) {
    return res.status(403).json({ error: 'Origem inv\u00e1lida.' });
  }
  return next();
}

function requireLocalAdmin(req, res, next) {
  if (!isLocalRequest(req)) {
    return res.status(403).json({ error: 'Admin dispon\u00edvel apenas no PC local.' });
  }
  return next();
}

// -- Admin Panel Helpers ---------------------------------------------------

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJsonSafe(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // no-op
  }
}

function ensureAdminAuth() {
  if (fs.existsSync(ADMIN_AUTH_FILE)) return;
  const hash = bcrypt.hashSync(DEFAULT_ADMIN_PIN, BCRYPT_ROUNDS);
  writeJsonSafe(ADMIN_AUTH_FILE, { pinHash: hash });
}

function getAdminPinHash() {
  const data = readJsonSafe(ADMIN_AUTH_FILE, null);
  return data && data.pinHash ? data.pinHash : null;
}

function verifyAdminPin(pin) {
  const hash = getAdminPinHash();
  if (!hash) return false;
  return bcrypt.compareSync(String(pin || ''), hash);
}

function createAdminSession() {
  const id = crypto.randomUUID();
  const sessions = readJsonSafe(ADMIN_SESSIONS_FILE, []);
  sessions.push({ id, createdAt: Date.now() });
  writeJsonSafe(ADMIN_SESSIONS_FILE, sessions);
  return id;
}

function verifyAdminSession(sessionId) {
  if (!sessionId) return false;
  const sessions = readJsonSafe(ADMIN_SESSIONS_FILE, []);
  const now = Date.now();
  const ttlMs = SESSION_TTL_SECONDS * 1000;
  const valid = sessions.filter((s) => (now - s.createdAt) < ttlMs);
  if (valid.length !== sessions.length) {
    writeJsonSafe(ADMIN_SESSIONS_FILE, valid);
  }
  return valid.some((s) => s.id === sessionId);
}

function destroyAdminSession(sessionId) {
  const sessions = readJsonSafe(ADMIN_SESSIONS_FILE, []);
  const filtered = sessions.filter((s) => s.id !== sessionId);
  writeJsonSafe(ADMIN_SESSIONS_FILE, filtered);
}

function logAdminAction(action, details) {
  const logs = readJsonSafe(ADMIN_LOGS_FILE, []);
  logs.unshift({ action, details, timestamp: Date.now() });
  if (logs.length > 500) logs.length = 500;
  writeJsonSafe(ADMIN_LOGS_FILE, logs);
}

// -- Upload middleware & processor -----------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo n\u00e3o permitido.'));
  }
});

async function processUpload(file) {
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webp`;
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  await sharp(file.buffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(UPLOADS_DIR, filename));
  return '/uploads/products/' + filename;
}

// -- Admin Panel Session Middleware ----------------------------------------

function requireAdminSession(req, res, next) {
  const cookies = parseCookies(req);
  const sessionId = cookies.tpoll_admin_session;
  if (!verifyAdminSession(sessionId)) {
    return res.status(401).json({ error: 'Sess\u00e3o inv\u00e1lida ou expirada.' });
  }
  return next();
}

function normalizeProduct(input) {
  const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const toStock = (value) => {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  };

  const pickImageFromCategory = (name, category) => {
    const categoryText = `${name || ''} ${category || ''}`.toLowerCase();

    if (categoryText.includes('mouse')) return 'assets/product-images/mouse.svg';
    if (categoryText.includes('switch') || categoryText.includes('rede')) return 'assets/product-images/network-switch.svg';
    if (categoryText.includes('hub') || categoryText.includes('usb')) return 'assets/product-images/usb-hub.svg';
    if (categoryText.includes('displayport') || categoryText.includes('hdmi') || categoryText.includes('vga') || categoryText.includes('dvi') || categoryText.includes('v\u00eddeo')) {
      return 'assets/product-images/video-adapter.svg';
    }
    if (categoryText.includes('som') || categoryText.includes('\u00e1udio') || categoryText.includes('audio')) return 'assets/product-images/audio-usb.svg';
    if (categoryText.includes('case') || categoryText.includes('armazenamento') || categoryText.includes('hd')) return 'assets/product-images/storage-case.svg';
    if (categoryText.includes('fonte') || categoryText.includes('energia') || categoryText.includes('powerbank')) return 'assets/product-images/power.svg';
    if (categoryText.includes('carregador') || categoryText.includes('veicular') || categoryText.includes('automotivo')) return 'assets/product-images/car-charger.svg';
    if (categoryText.includes('cabo') || categoryText.includes('adaptador')) return 'assets/product-images/cable.svg';

    return 'assets/product-images/cable.svg';
  };

  const normalizedName = cleanText(input.name, 120);
  const normalizedCategory = cleanText(input.category, 80);
  const normalizedImage = normalizeImageUrl(input.image);

  return {
    id: input.id || crypto.randomUUID(),
    name: normalizedName,
    category: normalizedCategory,
    description: cleanText(input.description, 500),
    price: Math.max(0, toNumber(input.price)),
    promoPrice: Math.max(0, toNumber(input.promoPrice)),
    onSale: Boolean(input.onSale),
    stock: toStock(input.stock),
    image: normalizedImage || pickImageFromCategory(normalizedName, normalizedCategory),
    active: Boolean(input.active),
    featured: Boolean(input.featured)
  };
}

app.disable('x-powered-by');

// --- Otimiza\u00e7\u00f5es de Performance -----------------------------------------------

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6
}));

// --- CORS -------------------------------------------------------------------

app.use((req, res, next) => {
  const allowed = ['https://tpolltech.github.io', 'http://localhost:5500', 'http://127.0.0.1:5500'];
  const origin = req.headers.origin;
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use((req, res, next) => {
  const pathname = req.path;

  if (/\.(js|css|png|jpg|jpeg|gif|ico|webp|woff2|ttf|eot|svg)$/i.test(pathname)) {
    const cacheTime = IS_PRODUCTION ? 'public, max-age=31536000, immutable' : 'no-cache, no-store';
    res.setHeader('Cache-Control', cacheTime);
  }
  else if (pathname.endsWith('.html') || pathname === '/') {
    const htmlCache = IS_PRODUCTION ? 'public, max-age=3600, must-revalidate' : 'no-cache, no-store';
    res.setHeader('Cache-Control', htmlCache);
  }
  else if (pathname.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }

  next();
});

// --- Security Headers -------------------------------------------------------

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});

app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  try {
    const cookies = parseCookies(req);
    const token = cookies.tpoll_auth_token;
    const authUser = verifyUserToken(token);
    activityService.trackVisit(req, authUser);
  } catch {
    // no-op
  }
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// -- Auth module ------------------------------------------------------------

app.use('/auth', (req, res, next) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
    .replace('::ffff:', '').split(',')[0].trim();

  const sensitiveRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isSensitive = sensitiveRoutes.some((r) => req.path === r && req.method === 'POST');

  if (isSensitive && !enforceRateLimit(`auth:${ip}`, 20, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' });
  }

  return next();
});

app.use('/auth', authRoutes);

// -- Store (public) ---------------------------------------------------------

app.get('/api/store/products', (req, res) => {
  const products = readProducts().filter((product) => product.active);
  res.json(products);
});

// -- Legacy Admin (local only, backward compat with loja.html) --------------

app.get('/api/admin/status', (req, res) => {
  if (!isLocalRequest(req)) {
    return res.json({ adminEnabled: false, loggedIn: false });
  }

  const cookies = parseCookies(req);
  const loggedIn = verifyAdminToken(cookies.tpoll_admin_token);
  return res.json({ adminEnabled: true, loggedIn });
});

app.post('/api/admin/login', requireSameOrigin, (req, res) => {
  if (!isLocalRequest(req)) {
    return res.status(403).json({ error: 'Admin dispon\u00edvel apenas no PC local.' });
  }

  const requester = (req.socket.remoteAddress || 'unknown').replace('::ffff:', '');
  if (!enforceRateLimit(`admin-login:${requester}`, 8, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' });
  }

  const password = String(req.body?.password || '');
  const supplied = Buffer.from(password, 'utf-8');
  const expected = Buffer.from(DEFAULT_ADMIN_PIN, 'utf-8');

  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.status(401).json({ error: 'Senha inv\u00e1lida.' });
  }

  const token = createAdminToken();
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `tpoll_admin_token=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${TOKEN_TTL_SECONDS}${secureFlag}`);
  return res.json({ ok: true });
});

app.post('/api/admin/logout', requireSameOrigin, (req, res) => {
  res.setHeader('Set-Cookie', 'tpoll_admin_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  return res.json({ ok: true });
});

app.get('/api/admin/products', requireLocalAdmin, (req, res) => {
  res.json(readProducts());
});

app.post('/api/admin/products', requireSameOrigin, requireLocalAdmin, (req, res) => {
  const product = normalizeProduct(req.body || {});

  if (!product.name) {
    return res.status(400).json({ error: 'Informe o nome do produto.' });
  }

  if (product.price <= 0) {
    return res.status(400).json({ error: 'Informe um pre\u00e7o v\u00e1lido.' });
  }

  const products = readProducts();
  products.unshift(product);
  saveProducts(products);
  gitPushAsync(`Admin: criou "${product.name}"`);
  return res.status(201).json(product);
});

app.put('/api/admin/products/:id', requireSameOrigin, requireLocalAdmin, (req, res) => {
  const id = String(req.params.id || '');
  const products = readProducts();
  const index = products.findIndex((item) => item.id === id);

  if (index < 0) {
    return res.status(404).json({ error: 'Produto n\u00e3o encontrado.' });
  }

  const updated = normalizeProduct({ ...req.body, id });
  if (!updated.name) {
    return res.status(400).json({ error: 'Informe o nome do produto.' });
  }

  if (updated.price <= 0) {
    return res.status(400).json({ error: 'Informe um pre\u00e7o v\u00e1lido.' });
  }

  products[index] = updated;
  saveProducts(products);
  return res.json(updated);
});

app.delete('/api/admin/products/:id', requireSameOrigin, requireLocalAdmin, (req, res) => {
  const id = String(req.params.id || '');
  const products = readProducts();
  const filtered = products.filter((item) => item.id !== id);

  if (filtered.length === products.length) {
    return res.status(404).json({ error: 'Produto n\u00e3o encontrado.' });
  }

  saveProducts(filtered);
  gitPushAsync(`Admin: removeu produto ${id}`);
  return res.json({ ok: true });
});

app.post('/api/admin/deploy', requireSameOrigin, requireLocalAdmin, (req, res) => {
  try {
    const siteDir = path.join(__dirname, '..');
    execSync('git add -A', { cwd: siteDir, timeout: 10000 });
    execSync('git commit -m "Atualiza\u00e7\u00e3o autom\u00e1tica via painel"', { cwd: siteDir, timeout: 10000, stdio: 'pipe' });
    execSync('git push', { cwd: siteDir, timeout: 30000, stdio: 'pipe' });
    return res.json({ ok: true, output: 'Publicado!' });
  } catch (error) {
    const msg = error.stderr ? error.stderr.toString() : error.message;
    if (msg.includes('nothing to commit')) return res.json({ ok: true, output: 'Nada para publicar.' });
    return res.status(500).json({ error: msg });
  }
});

// -- Admin Panel (new session-based system) ---------------------------------

app.post('/api/adminpanel/login', (req, res) => {
  const requester = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
    .replace('::ffff:', '').split(',')[0].trim();

  if (!enforceRateLimit(`adminpanel-login:${requester}`, 5, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' });
  }

  const pin = String(req.body?.pin || '');
  if (!verifyAdminPin(pin)) {
    return res.status(401).json({ error: 'PIN inv\u00e1lido.' });
  }

  const sessionId = createAdminSession();
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `tpoll_admin_session=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secureFlag}`);
  logAdminAction('LOGIN', { ip: requester });
  return res.json({ ok: true });
});

app.post('/api/adminpanel/logout', (req, res) => {
  const cookies = parseCookies(req);
  const sessionId = cookies.tpoll_admin_session;
  if (sessionId) destroyAdminSession(sessionId);
  res.setHeader('Set-Cookie', 'tpoll_admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  logAdminAction('LOGOUT', {});
  return res.json({ ok: true });
});

app.get('/api/adminpanel/status', (req, res) => {
  const cookies = parseCookies(req);
  const sessionId = cookies.tpoll_admin_session;
  const loggedIn = verifyAdminSession(sessionId);
  return res.json({ loggedIn });
});

app.get('/api/adminpanel/products', requireAdminSession, (req, res) => {
  res.json({ products: readProducts() });
});

app.post('/api/adminpanel/products', requireAdminSession, (req, res) => {
  const product = normalizeProduct(req.body || {});

  if (!product.name) {
    return res.status(400).json({ error: 'Informe o nome do produto.' });
  }

  if (product.price <= 0) {
    return res.status(400).json({ error: 'Informe um pre\u00e7o v\u00e1lido.' });
  }

  const products = readProducts();
  products.unshift(product);
  saveProducts(products);
  logAdminAction('CREATE_PRODUCT', { name: product.name, price: product.price });
  gitPushAsync(`Admin: criou "${product.name}"`);
  return res.status(201).json(product);
});

app.put('/api/adminpanel/products/:id', requireAdminSession, (req, res) => {
  const id = String(req.params.id || '');
  const products = readProducts();
  const index = products.findIndex((item) => item.id === id);

  if (index < 0) {
    return res.status(404).json({ error: 'Produto n\u00e3o encontrado.' });
  }

  const oldProduct = products[index];
  const updated = normalizeProduct({ ...req.body, id });
  if (!updated.name) {
    return res.status(400).json({ error: 'Informe o nome do produto.' });
  }

  if (updated.price <= 0) {
    return res.status(400).json({ error: 'Informe um pre\u00e7o v\u00e1lido.' });
  }

  const changes = {};
  if (oldProduct.price !== updated.price) changes.price = { from: oldProduct.price, to: updated.price };
  if (oldProduct.stock !== updated.stock) changes.stock = { from: oldProduct.stock, to: updated.stock };
  if (oldProduct.promoPrice !== updated.promoPrice) changes.promoPrice = { from: oldProduct.promoPrice, to: updated.promoPrice };
  if (oldProduct.featured !== updated.featured) changes.featured = { from: oldProduct.featured, to: updated.featured };
  if (oldProduct.active !== updated.active) changes.active = { from: oldProduct.active, to: updated.active };

  products[index] = updated;
  saveProducts(products);
  logAdminAction('UPDATE_PRODUCT', { id, name: updated.name, changes });
  gitPushAsync(`Admin: atualizou "${updated.name}"`);
  return res.json(updated);
});

app.delete('/api/adminpanel/products/:id', requireAdminSession, (req, res) => {
  const id = String(req.params.id || '');
  const products = readProducts();
  const product = products.find((item) => item.id === id);
  const filtered = products.filter((item) => item.id !== id);

  if (filtered.length === products.length) {
    return res.status(404).json({ error: 'Produto n\u00e3o encontrado.' });
  }

  saveProducts(filtered);
  logAdminAction('DELETE_PRODUCT', { id, name: product ? product.name : 'unknown' });
  gitPushAsync(`Admin: removeu "${product ? product.name : 'unknown'}"`);
  return res.json({ ok: true });
});

app.post('/api/adminpanel/upload', requireAdminSession, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    const url = await processUpload(req.file);
    logAdminAction('UPLOAD', { url });
    return res.json({ url });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro ao processar upload.' });
  }
});

app.get('/api/adminpanel/stats', requireAdminSession, (req, res) => {
  const products = readProducts();
  const totalValue = products.reduce((sum, p) => sum + ((p.promoPrice || p.price || 0) * (p.stock || 0)), 0);
  const stats = {
    total: products.length,
    active: products.filter((p) => p.active).length,
    outOfStock: products.filter((p) => p.stock <= 0).length,
    onSale: products.filter((p) => p.onSale).length,
    featured: products.filter((p) => p.featured).length,
    totalValue: Math.round(totalValue * 100) / 100
  };
  return res.json(stats);
});

app.get('/api/adminpanel/logs', requireAdminSession, (req, res) => {
  const logs = readJsonSafe(ADMIN_LOGS_FILE, []);
  return res.json({ logs: logs.slice(0, 100) });
});

app.post('/api/adminpanel/deploy', requireAdminSession, (req, res) => {
  try {
    const siteDir = path.join(__dirname, '..');
    execSync('git add -A', { cwd: siteDir, timeout: 10000 });
    execSync('git commit -m "Atualiza\u00e7\u00e3o autom\u00e1tica via painel"', { cwd: siteDir, timeout: 10000, stdio: 'pipe' });
    execSync('git push', { cwd: siteDir, timeout: 30000, stdio: 'pipe' });
    logAdminAction('DEPLOY', { output: 'Publicado!' });
    return res.json({ ok: true, output: 'Publicado!' });
  } catch (error) {
    const msg = error.stderr ? error.stderr.toString() : error.message;
    if (msg.includes('nothing to commit')) return res.json({ ok: true, output: 'Nada para publicar.' });
    return res.status(500).json({ error: msg });
  }
});

// -- Static files & pages ---------------------------------------------------

app.use(express.static(path.join(__dirname, '..', 'public')));

// -- Auth page routes -------------------------------------------------------

const authPages = {
  '/login':               ['modules', 'auth', 'pages', 'Login.html'],
  '/cadastro':            ['modules', 'auth', 'pages', 'Register.html'],
  '/esqueci-minha-senha': ['modules', 'auth', 'pages', 'ForgotPassword.html'],
  '/redefinir-senha':     ['modules', 'auth', 'pages', 'ResetPassword.html']
};

Object.entries(authPages).forEach(([route, fileParts]) => {
  app.get(route, (req, res) => res.sendFile(path.join(__dirname, ...fileParts)));
});

app.get('/painel-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'modules', 'auth', 'pages', 'AdminPanel.html'));
});

app.get('/adminpanel', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'adminpanel.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'html', 'index.html'));
});

// -- Init -------------------------------------------------------------------

ensureDataFile();
ensureAdminAuth();

app.listen(PORT, () => {
  console.log(`TPoll server running on http://127.0.0.1:${PORT}`);
});
