const storeProductsContainer = document.getElementById('storeProducts');
const storeEmpty = document.getElementById('storeEmpty');
const storeSearch = document.getElementById('storeSearch');
const storeCategoryFilter = document.getElementById('storeCategoryFilter');
const openStoreAdmin = document.getElementById('openStoreAdmin');
const storeAdminPanel = document.getElementById('storeAdminPanel');
const storeLoginForm = document.getElementById('storeLoginForm');
const storeAdminPassword = document.getElementById('storeAdminPassword');
const storeAdminLogout = document.getElementById('storeAdminLogout');
const storeAdminContent = document.getElementById('storeAdminContent');
const storeProductForm = document.getElementById('storeProductForm');
const storeAdminList = document.getElementById('storeAdminList');
const clearProductFormBtn = document.getElementById('clearProductForm');

let storeProducts = [];

function parseMoney(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatMoneyBRL(value) {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeImageUrl(value) {
    const image = String(value || '').trim();
    if (!image) return '';

    const hasUnsafeChars = /["'<>\\]/.test(image);
    if (hasUnsafeChars) return '';

    const isAllowedRelative = image.startsWith('assets/') || image.startsWith('/assets/') || image.startsWith('./assets/');
    const isAllowedAbsolute = image.startsWith('https://') || image.startsWith('http://');
    return isAllowedRelative || isAllowedAbsolute ? image : '';
}

function canProcessImageForBgRemoval(imageElement) {
    const src = String(imageElement.getAttribute('src') || imageElement.src || '');
    if (!src) return false;

    if (src.startsWith('data:')) return true;

    try {
        const url = new URL(src, window.location.href);
        return url.origin === window.location.origin;
    } catch {
        return false;
    }
}

function removeLightBackground(imageElement) {
    if (!imageElement || imageElement.dataset.bgProcessed === '1') return;

    const process = () => {
        if (!canProcessImageForBgRemoval(imageElement)) {
            imageElement.dataset.bgProcessed = '1';
            return;
        }

        const width = imageElement.naturalWidth;
        const height = imageElement.naturalHeight;
        if (!width || !height || width * height > 5000000) {
            imageElement.dataset.bgProcessed = '1';
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
            imageElement.dataset.bgProcessed = '1';
            return;
        }

        try {
            context.drawImage(imageElement, 0, 0, width, height);
            const imageData = context.getImageData(0, 0, width, height);
            const data = imageData.data;

            for (let index = 0; index < data.length; index += 4) {
                const red = data[index];
                const green = data[index + 1];
                const blue = data[index + 2];
                const alpha = data[index + 3];
                if (alpha === 0) continue;

                const max = Math.max(red, green, blue);
                const min = Math.min(red, green, blue);
                const isNeutral = (max - min) <= 22;

                if (isNeutral && max >= 240) {
                    data[index + 3] = 0;
                    continue;
                }

                if (isNeutral && max >= 220) {
                    data[index + 3] = Math.round(alpha * 0.35);
                }
            }

            context.putImageData(imageData, 0, 0);
            imageElement.src = canvas.toDataURL('image/png');
        } catch {
            // mantém imagem original caso não seja possível processar
        } finally {
            imageElement.dataset.bgProcessed = '1';
        }
    };

    if (imageElement.complete) {
        process();
    } else {
        imageElement.addEventListener('load', process, { once: true });
        imageElement.addEventListener('error', () => {
            imageElement.dataset.bgProcessed = '1';
        }, { once: true });
    }
}

function enhanceProductImages(container) {
    if (!container) return;
    const images = container.querySelectorAll('img.store-card-image');
    images.forEach((imageElement) => removeLightBackground(imageElement));
}

function isLocalClient() {
    const hostname = (window.location.hostname || '').toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });

    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await response.json() : null;

    if (!response.ok) {
        const message = (body && body.error) || 'Erro ao processar a solicitação.';
        throw new Error(message);
    }

    return body;
}

async function loadStoreProducts() {
    try {
        storeProducts = await apiRequest('/api/store/products', { method: 'GET' });
        return;
    } catch (error) {
        // fallback para ambientes estáticos (sem backend Node ativo)
    }

    const fallbackCandidates = [
        'assets/data/products.json',
        'server/store-data.json'
    ];

    let loadedProducts = null;

    for (const fallbackPath of fallbackCandidates) {
        try {
            const fallbackResponse = await fetch(fallbackPath, { cache: 'no-store' });
            if (!fallbackResponse.ok) continue;

            const fallbackData = await fallbackResponse.json();
            if (Array.isArray(fallbackData)) {
                loadedProducts = fallbackData;
                break;
            }
        } catch (fallbackError) {
            // tenta o próximo caminho de fallback
        }
    }

    if (!loadedProducts) {
        throw new Error('Não foi possível carregar os produtos.');
    }

    storeProducts = loadedProducts;
}

function getFilteredProducts() {
    const query = ((storeSearch && storeSearch.value) || '').trim().toLowerCase();
    const category = (storeCategoryFilter && storeCategoryFilter.value) || 'all';

    return storeProducts.filter((product) => {
        if (!product.active) return false;

        const matchesSearch = !query
            || product.name.toLowerCase().includes(query)
            || (product.description || '').toLowerCase().includes(query);

        const matchesCategory = category === 'all' || (product.category || '') === category;
        return matchesSearch && matchesCategory;
    });
}

function buildStoreCategoryOptions() {
    if (!storeCategoryFilter) return;

    const currentValue = storeCategoryFilter.value;
    const categories = [...new Set(
        storeProducts
            .map((product) => (product.category || '').trim())
            .filter(Boolean)
    )].sort((left, right) => left.localeCompare(right));

    storeCategoryFilter.innerHTML = '<option value="all">Todas as categorias</option>';

    categories.forEach((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        storeCategoryFilter.appendChild(option);
    });

    if ([...storeCategoryFilter.options].some((option) => option.value === currentValue)) {
        storeCategoryFilter.value = currentValue;
    }
}

// ── WhatsApp direct contact ────────────────────────────────────────────────

function openProductOnWhatsApp(product) {
    const finalPrice = product.onSale && product.promoPrice > 0 ? product.promoPrice : product.price;
    const message = [
        'Olá! Tenho interesse neste item da loja TPoll:',
        '',
        `*Produto:* ${product.name}`,
        `*Preço:* ${formatMoneyBRL(finalPrice)}`,
        `*Categoria:* ${product.category || 'Geral'}`,
        '',
        'Pode me passar mais detalhes?'
    ].join('\n');
    window.open(`https://wa.me/5555996765404?text=${encodeURIComponent(message)}`, '_blank');
}

// ── PIX Payment ─────────────────────────────────────────────────────────────

const PIX_KEY        = '51570488000123';
const PIX_MERCHANT   = 'TPoll Tecnologia';
const PIX_CITY       = 'Santa Maria';

function crc16Ccitt(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
        }
    }
    return crc;
}

function pixField(id, value) {
    const len = String(value.length).padStart(2, '0');
    return `${id}${len}${value}`;
}

function removeAccents(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '');
}

function buildPixPayload(amount, txId) {
    const key         = PIX_KEY;
    const merchantRaw = removeAccents(PIX_MERCHANT).slice(0, 25);
    const cityRaw     = removeAccents(PIX_CITY).slice(0, 15);
    const refLabel    = removeAccents(String(txId || 'TPoll')).replace(/\s+/g, '').slice(0, 25);

    const merchantAccount = pixField('00', 'BR.GOV.BCB.PIX') + pixField('01', key);
    const additionalData  = pixField('05', refLabel);

    let payload = pixField('00', '01')
        + pixField('26', merchantAccount)
        + pixField('52', '0000')
        + pixField('53', '986')
        + (amount > 0 ? pixField('54', amount.toFixed(2)) : '')
        + pixField('58', 'BR')
        + pixField('59', merchantRaw)
        + pixField('60', cityRaw)
        + pixField('62', additionalData)
        + '6304';

    const checksum = crc16Ccitt(payload).toString(16).toUpperCase().padStart(4, '0');
    return payload + checksum;
}

function openPixModal(product) {
    const finalPrice  = (product.onSale && product.promoPrice > 0) ? product.promoPrice : product.price;
    const txId        = 'TPOLL' + String(product.id || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20);
    const payload     = buildPixPayload(finalPrice, txId);

    const modal       = document.getElementById('pixModal');
    const canvas      = document.getElementById('pixQrCanvas');
    const nameEl      = document.getElementById('pixProductName');
    const priceEl     = document.getElementById('pixProductPrice');
    const confirmBtn  = document.getElementById('pixConfirmWhatsApp');
    const closeBtn    = document.getElementById('pixModalClose');
    const closeBtn2   = document.getElementById('pixModalClose2');
    const copyBtn     = document.getElementById('pixCopyBtn');
    const copyLabel   = document.getElementById('pixCopyLabel');

    if (!modal || !canvas) return;

    if (nameEl)  nameEl.textContent  = product.name || 'Produto TPoll';
    if (priceEl) priceEl.textContent = formatMoneyBRL(finalPrice);

    if (typeof QRCode !== 'undefined' && canvas) {
        QRCode.toCanvas(canvas, payload, {
            width: 220,
            margin: 1,
            color: { dark: '#0d2234', light: '#ffffff' }
        });
    }

    const closeModal = () => { modal.hidden = true; document.body.style.overflow = ''; };

    if (closeBtn)  closeBtn.onclick  = closeModal;
    if (closeBtn2) closeBtn2.onclick = closeModal;

    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(PIX_KEY).then(() => {
                if (copyLabel) copyLabel.textContent = 'Copiado!';
                setTimeout(() => { if (copyLabel) copyLabel.textContent = 'Copiar'; }, 2000);
            });
        };
    }

    if (confirmBtn) {
        confirmBtn.onclick = () => {
            const message = [
                'Olá! Acabei de realizar o pagamento via PIX na loja TPoll.',
                '',
                `*Produto:* ${product.name}`,
                `*Valor pago:* ${formatMoneyBRL(finalPrice)}`,
                `*ID da transação:* ${txId}`,
                '',
                'Poderia confirmar o recebimento e combinar a entrega?'
            ].join('\n');
            window.open(`https://wa.me/5555996765404?text=${encodeURIComponent(message)}`, '_blank');
            closeModal();
        };
    }

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
}



function createProductCard(product) {
    const card = document.createElement('article');
    card.className = 'store-card';

    const safeName = escapeHtml(product.name || '');
    const safeCategory = escapeHtml(product.category || 'Geral');
    const safeDescription = escapeHtml(product.description || 'Sem descrição.');
    const safeImage = sanitizeImageUrl(product.image);

    const imageMarkup = safeImage
        ? `<img src="${safeImage}" alt="${safeName}" class="store-card-image" loading="lazy">`
        : '<div class="store-card-image-placeholder"><span class="store-placeholder-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg></span></div>';

    const hasPromo = product.onSale && product.promoPrice > 0 && product.promoPrice < product.price;
    const priceMarkup = hasPromo
        ? `<p class="store-card-price"><span class="store-price-old">${formatMoneyBRL(parseMoney(product.price))}</span><span class="store-price-new">${formatMoneyBRL(parseMoney(product.promoPrice))}</span></p>`
        : `<p class="store-card-price">${formatMoneyBRL(parseMoney(product.price))}</p>`;

    card.innerHTML = `
        ${imageMarkup}
        <div class="store-card-content">
            <p class="store-card-category">${safeCategory}</p>
            <h3>${safeName}</h3>
            <p class="store-card-description">${safeDescription}</p>
            ${priceMarkup}
            <p class="store-card-stock">Estoque: ${Math.max(0, parseInt(product.stock || 0, 10))}</p>
            <div class="store-card-actions">
                <button type="button" class="store-buy-btn">WhatsApp</button>
                <button type="button" class="store-pix-btn">Pagar no PIX</button>
            </div>
        </div>
    `;

    if (hasPromo) {
        const badge = document.createElement('span');
        badge.className = 'store-sale-badge';
        badge.textContent = 'Promoção';
        card.appendChild(badge);
    }

    const buyButton = card.querySelector('.store-buy-btn');
    if (buyButton) {
        buyButton.addEventListener('click', () => openProductOnWhatsApp(product));
    }

    const pixButton = card.querySelector('.store-pix-btn');
    if (pixButton) {
        pixButton.addEventListener('click', () => openPixModal(product));
    }

    return card;
}

function renderStore() {
    if (!storeProductsContainer || !storeEmpty) return;

    const filteredProducts = getFilteredProducts();
    storeProductsContainer.innerHTML = '';

    if (filteredProducts.length === 0) {
        storeEmpty.hidden = false;
        return;
    }

    storeEmpty.hidden = true;
    filteredProducts.forEach((product) => {
        storeProductsContainer.appendChild(createProductCard(product));
    });
    enhanceProductImages(storeProductsContainer);
}

function setAdminLoggedIn(isLoggedIn) {
    if (!storeAdminContent || !storeAdminLogout || !storeAdminPassword) return;

    storeAdminContent.hidden = !isLoggedIn;
    storeAdminPassword.hidden = isLoggedIn;
    storeAdminLogout.hidden = !isLoggedIn;
}

function resetProductForm() {
    if (!storeProductForm) return;

    storeProductForm.reset();
    const idInput = document.getElementById('storeProductId');
    const activeInput = document.getElementById('productActive');
    const stockInput = document.getElementById('productStock');

    if (idInput) idInput.value = '';
    if (activeInput) activeInput.checked = true;
    if (stockInput) stockInput.value = '1';
}

function fillProductForm(product) {
    const idInput = document.getElementById('storeProductId');
    const nameInput = document.getElementById('productName');
    const categoryInput = document.getElementById('productCategory');
    const descriptionInput = document.getElementById('productDescription');
    const priceInput = document.getElementById('productPrice');
    const promoPriceInput = document.getElementById('productPromoPrice');
    const stockInput = document.getElementById('productStock');
    const imageInput = document.getElementById('productImage');
    const onSaleInput = document.getElementById('productOnSale');
    const activeInput = document.getElementById('productActive');

    if (idInput) idInput.value = product.id;
    if (nameInput) nameInput.value = product.name || '';
    if (categoryInput) categoryInput.value = product.category || '';
    if (descriptionInput) descriptionInput.value = product.description || '';
    if (priceInput) priceInput.value = parseMoney(product.price).toString();
    if (promoPriceInput) promoPriceInput.value = parseMoney(product.promoPrice).toString();
    if (stockInput) stockInput.value = Math.max(0, parseInt(product.stock || 0, 10)).toString();
    if (imageInput) imageInput.value = product.image || '';
    if (onSaleInput) onSaleInput.checked = Boolean(product.onSale);
    if (activeInput) activeInput.checked = Boolean(product.active);
}

function renderAdminList() {
    if (!storeAdminList) return;

    storeAdminList.innerHTML = '';

    if (storeProducts.length === 0) {
        storeAdminList.innerHTML = '<p class="store-empty">Nenhum item cadastrado.</p>';
        return;
    }

    storeProducts.forEach((product) => {
        const row = document.createElement('div');
        row.className = 'store-admin-item';

        const info = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = String(product.name || 'Sem nome');
        const meta = document.createElement('p');
        meta.textContent = `${product.category || 'Geral'} • Estoque: ${Math.max(0, parseInt(product.stock || 0, 10))}`;
        info.appendChild(title);
        info.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'store-admin-item-actions';

        const makeButton = (action, label, extraClass) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.action = action;
            button.dataset.id = String(product.id || '');
            button.className = extraClass ? `store-mini-btn ${extraClass}` : 'store-mini-btn';
            button.textContent = label;
            return button;
        };

        actions.appendChild(makeButton('toggle', product.active ? 'Desativar' : 'Ativar'));
        actions.appendChild(makeButton('edit', 'Editar'));
        actions.appendChild(makeButton('delete', 'Excluir', 'store-mini-btn-danger'));

        row.appendChild(info);
        row.appendChild(actions);

        storeAdminList.appendChild(row);
    });
}

async function reloadForAdmin() {
    storeProducts = await apiRequest('/api/admin/products', { method: 'GET' });
    buildStoreCategoryOptions();
    renderStore();
    renderAdminList();
}

async function reloadForPublic() {
    await loadStoreProducts();
    buildStoreCategoryOptions();
    renderStore();
    renderAdminList();
}

if (storeSearch) {
    storeSearch.addEventListener('input', renderStore);
}

if (storeCategoryFilter) {
    storeCategoryFilter.addEventListener('change', renderStore);
}

if (storeAdminLogout) {
    storeAdminLogout.addEventListener('click', async () => {
        try {
            await apiRequest('/api/admin/logout', { method: 'POST' });
        } catch (error) {
            // no-op
        }
        setAdminLoggedIn(false);
        resetProductForm();
        await reloadForPublic();
    });
}

if (storeLoginForm) {
    storeLoginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            await apiRequest('/api/admin/login', {
                method: 'POST',
                body: JSON.stringify({ password: ((storeAdminPassword && storeAdminPassword.value) || '').trim() })
            });

            if (storeAdminPassword) storeAdminPassword.value = '';
            setAdminLoggedIn(true);
            await reloadForAdmin();
        } catch (error) {
            alert(error.message);
        }
    });
}

if (storeProductForm) {
    storeProductForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const idInput = document.getElementById('storeProductId');
        const nameInput = document.getElementById('productName');
        const categoryInput = document.getElementById('productCategory');
        const descriptionInput = document.getElementById('productDescription');
        const priceInput = document.getElementById('productPrice');
        const promoPriceInput = document.getElementById('productPromoPrice');
        const stockInput = document.getElementById('productStock');
        const imageInput = document.getElementById('productImage');
        const onSaleInput = document.getElementById('productOnSale');
        const activeInput = document.getElementById('productActive');

        const id = (idInput && idInput.value) || '';
        const payload = {
            name: (nameInput && nameInput.value ? nameInput.value.trim() : ''),
            category: (categoryInput && categoryInput.value ? categoryInput.value.trim() : ''),
            description: (descriptionInput && descriptionInput.value ? descriptionInput.value.trim() : ''),
            price: parseMoney((priceInput && priceInput.value) || 0),
            promoPrice: parseMoney((promoPriceInput && promoPriceInput.value) || 0),
            stock: Math.max(0, parseInt((stockInput && stockInput.value) || '0', 10)),
            image: (imageInput && imageInput.value ? imageInput.value.trim() : ''),
            onSale: Boolean(onSaleInput && onSaleInput.checked),
            active: Boolean(activeInput && activeInput.checked)
        };

        if (!payload.name) {
            alert('Informe o nome do produto.');
            return;
        }

        if (payload.price <= 0) {
            alert('Informe um preço válido.');
            return;
        }

        try {
            if (id) {
                await apiRequest(`/api/admin/products/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            } else {
                await apiRequest('/api/admin/products', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }

            await reloadForAdmin();
            resetProductForm();
        } catch (error) {
            alert(error.message);
        }
    });
}

if (clearProductFormBtn) {
    clearProductFormBtn.addEventListener('click', resetProductForm);
}

if (storeAdminList) {
    storeAdminList.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;
        const product = storeProducts.find((item) => item.id === id);
        if (!product) return;

        if (action === 'edit') {
            fillProductForm(product);
            return;
        }

        try {
            if (action === 'toggle') {
                await apiRequest(`/api/admin/products/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ ...product, active: !product.active })
                });
                await reloadForAdmin();
                return;
            }

            if (action === 'delete') {
                const confirmed = window.confirm(`Remover "${product.name}" da loja?`);
                if (!confirmed) return;

                await apiRequest(`/api/admin/products/${id}`, {
                    method: 'DELETE'
                });

                await reloadForAdmin();
                resetProductForm();
            }
        } catch (error) {
            alert(error.message);
        }
    });
}

async function initStore() {
    if (openStoreAdmin) openStoreAdmin.hidden = true;
    if (storeAdminPanel) storeAdminPanel.hidden = true;

    try {
        const status = await apiRequest('/api/admin/status', { method: 'GET' });

        if (isLocalClient() && status.adminEnabled && openStoreAdmin) {
            openStoreAdmin.hidden = false;
            openStoreAdmin.addEventListener('click', () => {
                if (!storeAdminPanel) return;
                storeAdminPanel.hidden = !storeAdminPanel.hidden;
            });
        }

        if (status.loggedIn) {
            setAdminLoggedIn(true);
            await reloadForAdmin();
        } else {
            setAdminLoggedIn(false);
            await reloadForPublic();
        }
    } catch (error) {
        setAdminLoggedIn(false);
        try {
            await reloadForPublic();
        } catch (reloadError) {
            if (storeProductsContainer) storeProductsContainer.innerHTML = '';
            if (storeEmpty) {
                storeEmpty.textContent = 'Não foi possível carregar os produtos no momento.';
                storeEmpty.hidden = false;
            }
        }
    }
}

initStore();
