// ── Store Preview (homepage) ─────────────────────────────────────────────────

(function () {
    'use strict';

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

        const isAllowedAbsolute = image.startsWith('https://') || image.startsWith('http://');
        if (isAllowedAbsolute) return image;

        if (image.startsWith('../assets/')) return image;
        if (image.startsWith('assets/')) return `../${image}`;
        if (image.startsWith('./assets/')) return `../${image.slice(2)}`;
        if (image.startsWith('/assets/')) return `..${image}`;

        return '';
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
                // mantém imagem original
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

    function enhancePreviewImages(container) {
        if (!container) return;
        const images = container.querySelectorAll('.store-preview-img img');
        images.forEach((imageElement) => removeLightBackground(imageElement));
    }

    async function loadStorePreview() {
        const grid = document.getElementById('storePreviewGrid');
        if (!grid) return;

        try {
            let products = null;

            try {
                const apiResponse = await fetch('/api/store/products', { cache: 'no-store' });
                if (apiResponse.ok) {
                    const apiData = await apiResponse.json();
                    if (Array.isArray(apiData)) products = apiData;
                }
            } catch {
                // fallback estático abaixo
            }

            if (!products) {
                const fallbackPaths = ['../assets/data/products.json'];

                for (const fallbackPath of fallbackPaths) {
                    try {
                        const fallbackResponse = await fetch(fallbackPath, { cache: 'no-store' });
                        if (!fallbackResponse.ok) continue;

                        const fallbackData = await fallbackResponse.json();
                        if (Array.isArray(fallbackData)) {
                            products = fallbackData;
                            break;
                        }
                    } catch {
                        // tenta próximo fallback
                    }
                }
            }

            if (!products) throw new Error('No data source available');

            const active = products.filter(p => p.active !== false).slice(0, 4);
            if (active.length === 0) {
                grid.innerHTML = '<p class="store-preview-loading">Nenhum produto disponível no momento.</p>';
                return;
            }

            grid.innerHTML = active.map(p => {
                const safeName = escapeHtml(p.name || 'Produto TPoll');
                const safeDescription = escapeHtml(p.description || '');
                const safeImage = sanitizeImageUrl(p.image);
                const safePrice = Number(p.price);
                const priceText = Number.isFinite(safePrice) ? safePrice.toFixed(2).replace('.', ',') : '0,00';

                return `
                <a href="html/loja.html" class="store-preview-card" style="text-decoration:none">
                    <div class="store-preview-img">
                        ${safeImage
                            ? `<img src="${safeImage}" alt="${safeName}" loading="lazy">`
                            : `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`
                        }
                    </div>
                    <div class="store-preview-info">
                        <div class="store-preview-name">${safeName}</div>
                        ${safeDescription ? `<div class="store-preview-desc">${safeDescription}</div>` : ''}
                        <div class="store-preview-price">R$ ${priceText}</div>
                    </div>
                </a>
            `;
            }).join('');

            enhancePreviewImages(grid);
        } catch {
            grid.innerHTML = '<p class="store-preview-loading">Não foi possível carregar os produtos.</p>';
        }
    }

    loadStorePreview();
}());
