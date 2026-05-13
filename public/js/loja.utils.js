// loja.utils.js — TPoll Store: pure helpers + image processing
// Exposes: window.TPollUtils
// Deps: none

(function () {
    'use strict';

    // ── Money helpers ──────────────────────────────────────────────────────

    function parseMoney(value) {
        const numberValue = Number(value);
        return Number.isFinite(numberValue) ? numberValue : 0;
    }

    function formatMoneyBRL(value) {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }

    // ── HTML / URL sanitization ────────────────────────────────────────────

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

    // ── Environment ────────────────────────────────────────────────────────

    function isLocalClient() {
        const hostname = (window.location.hostname || '').toLowerCase();
        return hostname === 'localhost' || hostname === '127.0.0.1';
    }

    // ── Image background removal ───────────────────────────────────────────

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

    // ── Export ─────────────────────────────────────────────────────────────

    window.TPollUtils = {
        parseMoney,
        formatMoneyBRL,
        escapeHtml,
        sanitizeImageUrl,
        isLocalClient,
        canProcessImageForBgRemoval,
        removeLightBackground,
        enhanceProductImages
    };
}());
