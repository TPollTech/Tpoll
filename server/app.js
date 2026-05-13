const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const compression = require('compression');
const authRoutes = require('./modules/auth/routes/authRoutes');
const { verifyUserToken } = require('./modules/auth/services/authService');
const activityService = require('./modules/auth/services/activityService');

const app = express();

const PORT = Number(process.env.PORT || 5500);
const DATA_FILE = path.join(__dirname, 'store-data.json');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ADMIN_PASSWORD = process.env.TPOLL_ADMIN_PASSWORD || (IS_PRODUCTION ? '' : 'tpoll2026');
const TOKEN_SECRET = process.env.TPOLL_TOKEN_SECRET || (IS_PRODUCTION ? '' : 'troque-este-segredo-em-producao');
const TOKEN_TTL_SECONDS = 60 * 60 * 8;

if (IS_PRODUCTION && (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8)) {
  throw new Error('Defina TPOLL_ADMIN_PASSWORD com pelo menos 8 caracteres.');
}

if (IS_PRODUCTION && (!TOKEN_SECRET || TOKEN_SECRET.length < 32)) {
  throw new Error('Defina TPOLL_TOKEN_SECRET com pelo menos 32 caracteres.');
}

const rateLimitState = new Map();

const defaultProducts = [
  {
    id: crypto.randomUUID(),
    name: 'Cabo USB-C Turbo',
    category: 'Acessórios',
    description: 'Cabo reforçado com carregamento rápido.',
    price: 39.9,
    promoPrice: 29.9,
    onSale: true,
    stock: 12,
    image: '',
    active: true
  },
  {
    id: crypto.randomUUID(),
    name: 'Película 3D Premium',
    category: 'Proteção',
    description: 'Película resistente para celulares.',
    price: 45,
    promoPrice: 0,
    onSale: false,
    stock: 20,
    image: '',
    active: true
  }
];

function ensureDataFile() {
  if (fs.existsSync(DATA_FILE)) return;
  fs.writeFileSync(DATA_FILE, JSON.stringify(defaultProducts, null, 2), 'utf-8');
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

  const isAllowedRelative = image.startsWith('assets/') || image.startsWith('/assets/') || image.startsWith('./assets/');
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
  return crypto.createHmac('sha256', TOKEN_SECRET).update(payloadBase64).digest('hex');
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
    return res.status(403).json({ error: 'Origem inválida.' });
  }
  return next();
}

function requireLocalAdmin(req, res, next) {
  if (!isLocalRequest(req)) {
    return res.status(403).json({ error: 'Admin disponível apenas no PC local.' });
  }

  const cookies = parseCookies(req);
  const token = cookies.tpoll_admin_token;

  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Não autenticado.' });
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
    if (categoryText.includes('displayport') || categoryText.includes('hdmi') || categoryText.includes('vga') || categoryText.includes('dvi') || categoryText.includes('vídeo')) {
      return 'assets/product-images/video-adapter.svg';
    }
    if (categoryText.includes('som') || categoryText.includes('áudio') || categoryText.includes('audio')) return 'assets/product-images/audio-usb.svg';
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
    active: Boolean(input.active)
  };
}

app.disable('x-powered-by');

// ─── Otimizações de Performance ────────────────────────────────────────────

// Compressão Gzip
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6
}));

// Cache Headers Inteligente
app.use((req, res, next) => {
  const pathname = req.path;
  
  // Assets estáticos - cache longo (1 ano)
  if (/\.(js|css|png|jpg|jpeg|gif|ico|webp|woff2|ttf|eot|svg)$/i.test(pathname)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // HTML - cache curto (1 hora)
  else if (pathname.endsWith('.html') || pathname === '/') {
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
  }
  // API - sem cache
  else if (pathname.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  
  next();
});

// ─── Security Headers ─────────────────────────────────────────────────────

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

// ── Auth module ───────────────────────────────────────────────────────────

// Rate-limit auth endpoints to prevent brute-force attacks
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

app.get('/api/store/products', (req, res) => {
  const products = readProducts().filter((product) => product.active);
  res.json(products);
});

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
    return res.status(403).json({ error: 'Admin disponível apenas no PC local.' });
  }

  const requester = (req.socket.remoteAddress || 'unknown').replace('::ffff:', '');
  if (!enforceRateLimit(`admin-login:${requester}`, 8, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' });
  }

  const password = String(req.body?.password || '');
  const supplied = Buffer.from(password, 'utf-8');
  const expected = Buffer.from(ADMIN_PASSWORD, 'utf-8');

  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.status(401).json({ error: 'Senha inválida.' });
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
    return res.status(400).json({ error: 'Informe um preço válido.' });
  }

  const products = readProducts();
  products.unshift(product);
  saveProducts(products);
  return res.status(201).json(product);
});

app.put('/api/admin/products/:id', requireSameOrigin, requireLocalAdmin, (req, res) => {
  const id = String(req.params.id || '');
  const products = readProducts();
  const index = products.findIndex((item) => item.id === id);

  if (index < 0) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  const updated = normalizeProduct({ ...req.body, id });
  if (!updated.name) {
    return res.status(400).json({ error: 'Informe o nome do produto.' });
  }

  if (updated.price <= 0) {
    return res.status(400).json({ error: 'Informe um preço válido.' });
  }

  products[index] = updated;
  saveProducts(products);
  return res.json(updated);
});

app.delete('/api/admin/products/:id', requireSameOrigin, requireLocalAdmin, (req, res) => {
  const id = String(req.params.id || '');
  const products = readProducts();
  const next = products.filter((item) => item.id !== id);

  if (next.length === products.length) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  saveProducts(next);
  return res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Auth page routes ──────────────────────────────────────────────────────
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'html', 'index.html'));
});

ensureDataFile();

app.listen(PORT, () => {
  console.log(`TPoll server running on http://127.0.0.1:${PORT}`);
});
