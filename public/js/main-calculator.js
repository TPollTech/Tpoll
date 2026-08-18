// ── Price Calculator ─────────────────────────────────────────────────────────

(function () {
    'use strict';

    const calcDeviceOptions = document.querySelectorAll('#calcDevice .calc-option');
    const calcServiceOptions = document.querySelectorAll('#calcService .calc-option');
    const calcResult = document.getElementById('calcResult');

    let selectedDevice = null;
    let selectedService = null;

    function isServiceCompatible(serviceOption, deviceOption) {
        if (!serviceOption || !deviceOption) return true;

        const compatibleDevices = (serviceOption.dataset.devices || '')
            .split(',')
            .map(device => device.trim())
            .filter(Boolean);

        if (compatibleDevices.length === 0) return true;
        return compatibleDevices.includes(deviceOption.dataset.value);
    }

    function updateServiceAvailability() {
        calcServiceOptions.forEach(option => {
            const compatible = !selectedDevice || isServiceCompatible(option, selectedDevice);
            option.disabled = !compatible;
            option.classList.toggle('is-disabled', !compatible);

            if (!compatible && option === selectedService) {
                option.classList.remove('selected');
                selectedService = null;
            }
        });
    }

    function updateCalculatorResult() {
        if (!calcResult) return;

        const resultValue = calcResult.querySelector('.result-value');

        if (selectedDevice && selectedService) {
            const basePrice = parseFloat(selectedDevice.dataset.base);
            const multiplier = parseFloat(selectedService.dataset.mult);
            const minPrice = Math.round(basePrice * multiplier);
            const maxPrice = Math.round(minPrice * 1.8);
            resultValue.innerHTML = `R$ ${minPrice} <span style="font-size: 1.2rem; font-weight: 400;">a</span> R$ ${maxPrice}`;
        } else if (selectedDevice || selectedService) {
            resultValue.textContent = 'Selecione ambas opções';
        } else {
            resultValue.textContent = 'Selecione as opções';
        }
    }

    calcDeviceOptions.forEach(option => {
        option.addEventListener('click', () => {
            calcDeviceOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedDevice = option;
            updateServiceAvailability();
            updateCalculatorResult();
        });
    });

    calcServiceOptions.forEach(option => {
        option.addEventListener('click', () => {
            if (option.disabled) return;
            calcServiceOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedService = option;
            updateCalculatorResult();
        });
    });

    updateServiceAvailability();
}());
