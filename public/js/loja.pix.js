(function () {
    const PIX_KEY = '51570488000123';
    const PIX_MERCHANT = 'TPoll Tecnologia';
    const PIX_CITY = 'Santa Maria';

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
        const merchantRaw = removeAccents(PIX_MERCHANT).slice(0, 25);
        const cityRaw = removeAccents(PIX_CITY).slice(0, 15);
        const refLabel = removeAccents(String(txId || 'TPoll')).replace(/\s+/g, '').slice(0, 25);

        const merchantAccount = pixField('00', 'BR.GOV.BCB.PIX') + pixField('01', PIX_KEY);
        const additionalData = pixField('05', refLabel);

        const payload = pixField('00', '01')
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

    function openPixModal(product, options) {
        const formatMoneyBRL = options && options.formatMoneyBRL
            ? options.formatMoneyBRL
            : function (value) { return `R$ ${Number(value).toFixed(2).replace('.', ',')}`; };

        const finalPrice = (product.onSale && product.promoPrice > 0) ? product.promoPrice : product.price;
        const txId = 'TPOLL' + String(product.id || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20);
        const payload = buildPixPayload(finalPrice, txId);

        const modal = document.getElementById('pixModal');
        const nameEl = document.getElementById('pixProductName');
        const priceEl = document.getElementById('pixProductPrice');
        const confirmBtn = document.getElementById('pixConfirmWhatsApp');
        const closeBtn = document.getElementById('pixModalClose');
        const closeBtn2 = document.getElementById('pixModalClose2');
        const copyBtn = document.getElementById('pixCopyBtn');
        const copyLabel = document.getElementById('pixCopyLabel');

        if (!modal) return;

        if (nameEl) nameEl.textContent = product.name || 'Produto TPoll';
        if (priceEl) priceEl.textContent = formatMoneyBRL(finalPrice);

        const closeModal = function () {
            modal.hidden = true;
            document.body.style.overflow = '';
        };

        if (closeBtn) closeBtn.onclick = closeModal;
        if (closeBtn2) closeBtn2.onclick = closeModal;

        modal.onclick = function (event) {
            if (event.target === modal) closeModal();
        };

        if (copyBtn) {
            copyBtn.onclick = function () {
                navigator.clipboard.writeText(PIX_KEY).then(function () {
                    if (copyLabel) copyLabel.textContent = 'Copiado!';
                    setTimeout(function () {
                        if (copyLabel) copyLabel.textContent = 'Copiar';
                    }, 2000);
                });
            };
        }

        if (confirmBtn) {
            confirmBtn.onclick = function () {
                const message = [
                    'Olá! Acabei de realizar o pagamento via PIX na loja TPoll.',
                    '',
                    `*Produto:* ${product.name}`,
                    `*Valor pago:* ${formatMoneyBRL(finalPrice)}`,
                    `*ID da transação:* ${txId}`,
                    '',
                    'Segue o comprovante em anexo.',
                    'Poderia confirmar o recebimento e combinar a entrega?'
                ].join('\n');
                window.open(`https://wa.me/5555996765404?text=${encodeURIComponent(message)}`, '_blank');
                closeModal();
            };
        }

        modal.hidden = false;
        document.body.style.overflow = 'hidden';

        const qrImg = document.getElementById('pixQrImg');
        const qrLoading = document.getElementById('pixQrLoading');
        const qrFallback = document.getElementById('pixQrFallback');

        if (qrImg) {
            qrImg.hidden = true;
            qrImg.src = '';
        }
        if (qrFallback) qrFallback.hidden = true;
        if (qrLoading) qrLoading.hidden = false;

        if (qrImg) {
            const encoded = encodeURIComponent(payload);
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=4&data=${encoded}`;

            qrImg.onload = function () {
                if (qrLoading) qrLoading.hidden = true;
                qrImg.hidden = false;
            };

            qrImg.onerror = function () {
                if (qrLoading) qrLoading.hidden = true;
                if (qrFallback) qrFallback.hidden = false;
            };

            qrImg.src = qrUrl;
        }
    }

    window.TPollPix = {
        openPixModal
    };
})();
