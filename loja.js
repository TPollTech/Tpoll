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

    const fallbackResponse = await fetch('server/store-data.json', {
        cache: 'no-store'
    });

    if (!fallbackResponse.ok) {
        throw new Error('Não foi possível carregar os produtos.');
    }

    const fallbackData = await fallbackResponse.json();
    storeProducts = Array.isArray(fallbackData) ? fallbackData : [];
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

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/5555996765404?text=${encodedMessage}`, '_blank');
}

function createProductCard(product) {
    const card = document.createElement('article');
    card.className = 'store-card';

    const imageMarkup = product.image
        ? `<img src="${product.image}" alt="${product.name}" class="store-card-image">`
        : '<div class="store-card-image-placeholder"><span class="store-placeholder-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg></span></div>';

    const hasPromo = product.onSale && product.promoPrice > 0 && product.promoPrice < product.price;
    const priceMarkup = hasPromo
        ? `<p class="store-card-price"><span class="store-price-old">${formatMoneyBRL(parseMoney(product.price))}</span><span class="store-price-new">${formatMoneyBRL(parseMoney(product.promoPrice))}</span></p>`
        : `<p class="store-card-price">${formatMoneyBRL(parseMoney(product.price))}</p>`;

    card.innerHTML = `
        ${imageMarkup}
        <div class="store-card-content">
            <p class="store-card-category">${product.category || 'Geral'}</p>
            <h3>${product.name}</h3>
            <p class="store-card-description">${product.description || 'Sem descrição.'}</p>
            ${priceMarkup}
            <p class="store-card-stock">Estoque: ${Math.max(0, parseInt(product.stock || 0, 10))}</p>
            <button type="button" class="store-buy-btn">Comprar pelo WhatsApp</button>
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

        row.innerHTML = `
            <div>
                <strong>${product.name}</strong>
                <p>${product.category || 'Geral'} • Estoque: ${Math.max(0, parseInt(product.stock || 0, 10))}</p>
            </div>
            <div class="store-admin-item-actions">
                <button type="button" data-action="toggle" data-id="${product.id}" class="store-mini-btn">${product.active ? 'Desativar' : 'Ativar'}</button>
                <button type="button" data-action="edit" data-id="${product.id}" class="store-mini-btn">Editar</button>
                <button type="button" data-action="delete" data-id="${product.id}" class="store-mini-btn store-mini-btn-danger">Excluir</button>
            </div>
        `;

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
