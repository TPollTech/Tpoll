// loja.ui.js — TPoll Store: card creation, filtering, rendering
// Exposes: window.TPollStoreUI
// Deps: loja.utils.js (TPollUtils), loja.pix.js (TPollPix)
// Init: call window.TPollStoreUI.init(context) from loja.js
//   context.getProducts() → returns current products array

(function () {
    'use strict';

    const {
        parseMoney,
        formatMoneyBRL,
        escapeHtml,
        sanitizeImageUrl,
        enhanceProductImages
    } = window.TPollUtils;

    // ── DOM refs ───────────────────────────────────────────────────────────

    const storeProductsContainer = document.getElementById('storeProducts');
    const storeEmpty             = document.getElementById('storeEmpty');
    const storeSearch            = document.getElementById('storeSearch');
    const storeCategoryFilter    = document.getElementById('storeCategoryFilter');

    // ── Context ────────────────────────────────────────────────────────────

    let _getProducts = () => [];

    // ── WhatsApp + PIX actions ─────────────────────────────────────────────

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

    function openProductOnPix(product) {
        if (!window.TPollPix || typeof window.TPollPix.openPixModal !== 'function') {
            alert('PIX indisponível no momento. Tente novamente.');
            return;
        }
        window.TPollPix.openPixModal(product, { formatMoneyBRL });
    }

    // ── Card creation ──────────────────────────────────────────────────────

    function createProductCard(product) {
        const card = document.createElement('article');
        card.className = 'store-card';

        const safeName        = escapeHtml(product.name || '');
        const safeCategory    = escapeHtml(product.category || 'Geral');
        const safeDescription = escapeHtml(product.description || 'Sem descrição.');
        const safeImage       = sanitizeImageUrl(product.image);

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
            pixButton.addEventListener('click', () => openProductOnPix(product));
        }

        return card;
    }

    // ── Filtering ──────────────────────────────────────────────────────────

    function getFilteredProducts() {
        const query    = ((storeSearch && storeSearch.value) || '').trim().toLowerCase();
        const category = (storeCategoryFilter && storeCategoryFilter.value) || 'all';

        return _getProducts().filter((product) => {
            if (!product.active) return false;

            const matchesSearch = !query
                || product.name.toLowerCase().includes(query)
                || (product.description || '').toLowerCase().includes(query);

            const matchesCategory = category === 'all' || (product.category || '') === category;
            return matchesSearch && matchesCategory;
        });
    }

    // ── Category dropdown ──────────────────────────────────────────────────

    function buildStoreCategoryOptions() {
        if (!storeCategoryFilter) return;

        const currentValue = storeCategoryFilter.value;
        const categories = [...new Set(
            _getProducts()
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

    // ── Store render ───────────────────────────────────────────────────────

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

    // ── Init ───────────────────────────────────────────────────────────────

    function init(context) {
        _getProducts = context.getProducts || (() => []);

        if (storeSearch) {
            storeSearch.addEventListener('input', renderStore);
        }

        if (storeCategoryFilter) {
            storeCategoryFilter.addEventListener('change', renderStore);
        }
    }

    // ── Export ─────────────────────────────────────────────────────────────

    window.TPollStoreUI = {
        init,
        renderStore,
        buildStoreCategoryOptions
    };
}());
