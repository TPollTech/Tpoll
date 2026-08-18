// ── Contact form (WhatsApp) + Phone mask ─────────────────────────────────────

(function () {
    'use strict';

    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const nome = document.getElementById('nome').value.trim();
            const telefone = document.getElementById('telefone').value.trim();
            const aparelho = document.getElementById('aparelho').value;
            const modelo = document.getElementById('modelo').value.trim();
            const problema = document.getElementById('problema').value.trim();

            let message = `Olá! Gostaria de solicitar um orçamento.\n\n`;
            message += `*Nome:* ${nome}\n`;
            message += `*Telefone:* ${telefone}\n`;
            message += `*Tipo de Aparelho:* ${aparelho}\n`;
            if (modelo) {
                message += `*Marca/Modelo:* ${modelo}\n`;
            }
            message += `\n*Problema:*\n${problema}`;

            const encodedMessage = encodeURIComponent(message);
            window.open(`https://wa.me/5555996765404?text=${encodedMessage}`, '_blank');
        });
    }

    const telefoneInput = document.getElementById('telefone');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);

            if (value.length > 0) {
                value = '(' + value;
            }
            if (value.length > 3) {
                value = value.slice(0, 3) + ') ' + value.slice(3);
            }
            if (value.length > 10) {
                value = value.slice(0, 10) + '-' + value.slice(10);
            }

            e.target.value = value;
        });
    }
}());
