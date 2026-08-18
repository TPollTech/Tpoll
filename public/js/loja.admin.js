// loja.admin.js — TPoll Store: admin panel UI + event handlers
// Exposes: window.TPollStoreAdmin
// Deps: loja.utils.js (TPollUtils), loja.api.js (TPollStoreApi)
// Init: call window.TPollStoreAdmin.init(context) from loja.js
//   context.getProducts()        → returns current products array
//   context.setProducts(arr)     → updates store products array
//   context.reloadForAdmin()     → async, reloads as admin
//   context.reloadForPublic()    → async, reloads as public

(function () {
    'use strict';

    const { parseMoney } = window.TPollUtils;
    const storeApi = (window.TPollStoreApi && typeof window.TPollStoreApi.apiRequest === 'function')
        ? window.TPollStoreApi
        : null;

    // ── DOM refs ───────────────────────────────────────────────────────────

    const storeAdminPanel    = document.getElementById('storeAdminPanel');
    const storeAdminContent  = document.getElementById('storeAdminContent');
    const storeAdminLogout   = document.getElementById('storeAdminLogout');
    const storeAdminPassword = document.getElementById('storeAdminPassword');
    const storeLoginForm     = document.getElementById('storeLoginForm');
    const storeProductForm   = document.getElementById('storeProductForm');
    const storeAdminList     = document.getElementById('storeAdminList');
    const clearProductFormBtn = document.getElementById('clearProductForm');

    // ── Visibility ─────────────────────────────────────────────────────────

    function setAdminLoggedIn(isLoggedIn) {
        if (!storeAdminContent) return;

        storeAdminContent.hidden = !isLoggedIn;
        if (storeAdminPassword) storeAdminPassword.hidden = isLoggedIn;
        if (storeAdminLogout) storeAdminLogout.hidden = !isLoggedIn;
    }

    // ── Product form ───────────────────────────────────────────────────────

    function resetProductForm() {
        if (!storeProductForm) return;

        storeProductForm.reset();
        const idInput     = document.getElementById('storeProductId');
        const activeInput = document.getElementById('productActive');
        const stockInput  = document.getElementById('productStock');

        if (idInput)     idInput.value = '';
        if (activeInput) activeInput.checked = true;
        if (stockInput)  stockInput.value = '1';
    }

    function fillProductForm(product) {
        const idInput          = document.getElementById('storeProductId');
        const nameInput        = document.getElementById('productName');
        const categoryInput    = document.getElementById('productCategory');
        const descriptionInput = document.getElementById('productDescription');
        const priceInput       = document.getElementById('productPrice');
        const promoPriceInput  = document.getElementById('productPromoPrice');
        const stockInput       = document.getElementById('productStock');
        const imageInput       = document.getElementById('productImage');
        const onSaleInput      = document.getElementById('productOnSale');
        const activeInput      = document.getElementById('productActive');
        const featuredInput    = document.getElementById('productFeatured');

        if (idInput)          idInput.value          = product.id;
        if (nameInput)        nameInput.value        = product.name || '';
        if (categoryInput)    categoryInput.value    = product.category || '';
        if (descriptionInput) descriptionInput.value = product.description || '';
        if (priceInput)       priceInput.value       = parseMoney(product.price).toString();
        if (promoPriceInput)  promoPriceInput.value  = parseMoney(product.promoPrice).toString();
        if (stockInput)       stockInput.value       = Math.max(0, parseInt(product.stock || 0, 10)).toString();
        if (imageInput)       imageInput.value       = product.image || '';
        if (onSaleInput)      onSaleInput.checked    = Boolean(product.onSale);
        if (activeInput)      activeInput.checked    = Boolean(product.active);
        if (featuredInput)    featuredInput.checked  = Boolean(product.featured);
    }

    // ── Admin list render ──────────────────────────────────────────────────

    function renderAdminList(products) {
        if (!storeAdminList) return;

        storeAdminList.innerHTML = '';

        if (!products || products.length === 0) {
            storeAdminList.innerHTML = '<p class="store-empty">Nenhum item cadastrado.</p>';
            return;
        }

        products.forEach((product) => {
            const row = document.createElement('div');
            row.className = 'store-admin-item';

            const stock = Math.max(0, parseInt(product.stock || 0, 10));

            const info  = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = String(product.name || 'Sem nome');
            const meta = document.createElement('p');

            let stockClass = 'stock-ok';
            let stockText = `Estoque: ${stock}`;
            if (stock === 0) {
                stockClass = 'stock-empty';
                stockText = 'Sem estoque';
            } else if (stock <= 3) {
                stockClass = 'stock-low';
                stockText = `Última${stock === 1 ? '' : 's'} ${stock} unidade${stock === 1 ? '' : 's'}!`;
            }
            meta.innerHTML = `${product.category || 'Geral'} • <span class="${stockClass}">${stockText}</span>`;
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

            if (stock === 0) {
                actions.appendChild(makeButton('restore', 'Restaurar (1)', 'store-mini-btn-success'));
            } else {
                actions.appendChild(makeButton('outOfStock', 'Sem estoque', 'store-mini-btn-warning'));
            }

            actions.appendChild(makeButton('delete', 'Excluir', 'store-mini-btn-danger'));

            row.appendChild(info);
            row.appendChild(actions);
            storeAdminList.appendChild(row);
        });
    }

    // ── Deploy ─────────────────────────────────────────────────────────────

    function handleDeploy() {
        const deployBtn = document.getElementById('deployPushBtn');
        const deployStatus = document.getElementById('deployStatus');
        if (!deployBtn) return;

        deployBtn.addEventListener('click', async () => {
            deployBtn.disabled = true;
            if (deployStatus) {
                deployStatus.textContent = 'Publicando...';
                deployStatus.className = 'deploy-status';
            }

            try {
                const result = await storeApi.apiRequest('/api/admin/deploy', { method: 'POST' });
                if (deployStatus) {
                    deployStatus.textContent = result.output || 'Feito!';
                    deployStatus.className = 'deploy-status deploy-ok';
                }
            } catch (error) {
                if (deployStatus) {
                    deployStatus.textContent = error.message || 'Erro ao publicar.';
                    deployStatus.className = 'deploy-status deploy-error';
                }
            } finally {
                deployBtn.disabled = false;
            }
        });
    }

    // ── Init: attach event listeners ───────────────────────────────────────

    function init(context) {
        const { getProducts, reloadForAdmin, reloadForPublic } = context;

        if (storeAdminLogout) {
            storeAdminLogout.addEventListener('click', async () => {
                try {
                    await storeApi.apiRequest('/api/admin/logout', { method: 'POST' });
                } catch {
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
                    await storeApi.apiRequest('/api/admin/login', {
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

                const idInput          = document.getElementById('storeProductId');
                const nameInput        = document.getElementById('productName');
                const categoryInput    = document.getElementById('productCategory');
                const descriptionInput = document.getElementById('productDescription');
                const priceInput       = document.getElementById('productPrice');
                const promoPriceInput  = document.getElementById('productPromoPrice');
                const stockInput       = document.getElementById('productStock');
                const imageInput       = document.getElementById('productImage');
                const onSaleInput      = document.getElementById('productOnSale');
                const activeInput      = document.getElementById('productActive');
                const featuredInput    = document.getElementById('productFeatured');

                const id = (idInput && idInput.value) || '';
                const payload = {
                    name:        (nameInput && nameInput.value ? nameInput.value.trim() : ''),
                    category:    (categoryInput && categoryInput.value ? categoryInput.value.trim() : ''),
                    description: (descriptionInput && descriptionInput.value ? descriptionInput.value.trim() : ''),
                    price:       parseMoney((priceInput && priceInput.value) || 0),
                    promoPrice:  parseMoney((promoPriceInput && promoPriceInput.value) || 0),
                    stock:       Math.max(0, parseInt((stockInput && stockInput.value) || '0', 10)),
                    image:       (imageInput && imageInput.value ? imageInput.value.trim() : ''),
                    onSale:      Boolean(onSaleInput && onSaleInput.checked),
                    active:      Boolean(activeInput && activeInput.checked),
                    featured:    Boolean(featuredInput && featuredInput.checked)
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
                        await storeApi.apiRequest(`/api/admin/products/${id}`, {
                            method: 'PUT',
                            body: JSON.stringify(payload)
                        });
                    } else {
                        await storeApi.apiRequest('/api/admin/products', {
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

                const action  = button.dataset.action;
                const id      = button.dataset.id;
                const product = getProducts().find((item) => item.id === id);
                if (!product) return;

                if (action === 'edit') {
                    fillProductForm(product);
                    return;
                }

                try {
                    if (action === 'toggle') {
                        await storeApi.apiRequest(`/api/admin/products/${id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ ...product, active: !product.active })
                        });
                        await reloadForAdmin();
                        return;
                    }

                    if (action === 'restore') {
                        await storeApi.apiRequest(`/api/admin/products/${id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ ...product, stock: 1 })
                        });
                        await reloadForAdmin();
                        return;
                    }

                    if (action === 'outOfStock') {
                        await storeApi.apiRequest(`/api/admin/products/${id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ ...product, stock: 0 })
                        });
                        await reloadForAdmin();
                        return;
                    }

                    if (action === 'delete') {
                        const confirmed = window.confirm(`Remover "${product.name}" da loja?`);
                        if (!confirmed) return;

                        await storeApi.apiRequest(`/api/admin/products/${id}`, {
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

        handleDeploy();
    }

    // ── Export ─────────────────────────────────────────────────────────────

    window.TPollStoreAdmin = {
        init,
        setAdminLoggedIn,
        resetProductForm,
        renderAdminList
    };
}());
