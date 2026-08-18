// ── Typewriter Effect ────────────────────────────────────────────────────────

(function () {
    'use strict';

    const typewriterElement = document.getElementById('typewriter');
    const typewriterTexts = [
        'Conserto de celulares com garantia',
        'Reparo de notebooks e computadores',
        'Manutenção de eletrônicos em geral',
        'Diagnóstico gratuito e rápido',
        'Qualidade, agilidade e confiança'
    ];

    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 80;

    function typeWriter() {
        if (!typewriterElement) return;

        const currentText = typewriterTexts[textIndex];

        if (isDeleting) {
            typewriterElement.textContent = currentText.substring(0, charIndex - 1);
            charIndex--;
            typeSpeed = 40;
        } else {
            typewriterElement.textContent = currentText.substring(0, charIndex + 1);
            charIndex++;
            typeSpeed = 80;
        }

        if (!isDeleting && charIndex === currentText.length) {
            isDeleting = true;
            typeSpeed = 2000;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            textIndex = (textIndex + 1) % typewriterTexts.length;
            typeSpeed = 500;
        }

        setTimeout(typeWriter, typeSpeed);
    }

    setTimeout(typeWriter, 1000);
}());
