// static/js/checkout.js
document.addEventListener("DOMContentLoaded", function() {
    console.log("🛒 CHECKOUT.JS CARREGADO!");

    const btnContinue1 = document.getElementById('btn-continue-step1');
    const btnBack2 = document.getElementById('btn-back-step2');
    const btnOpenMap = document.getElementById('btn-open-map-modal');
    const actionPanel = document.getElementById('delivery-action-panel');
    const cardDelivery = document.getElementById('card-delivery');
    const addressDisplay = document.getElementById('address-display');
    const stepDelivery = document.getElementById('step-delivery');
    const stepPayment = document.getElementById('step-payment');
    const stepConclusion = document.getElementById('step-conclusion');
    const checkoutBairroIdInput = document.getElementById('checkout_bairro_id');
    const checkoutForm = document.getElementById('checkout-form');

    function precisaDeEndereco() {
        if (addressDisplay) return addressDisplay.innerText.toLowerCase().includes('informe');
        return false;
    }

    // --- ESCUTADOR MÁGICO: Disparado pelo modal_mapbox.js quando o form salva ---
    document.addEventListener('enderecoSalvo', function(e) {
        const details = e.detail;
        if (addressDisplay) {
            addressDisplay.innerHTML = `${details.logradouro}, ${details.numero} - ${details.bairro}`;
            addressDisplay.classList.remove('text-muted');
        }
        
        if(actionPanel) {
            actionPanel.innerHTML = `
                <span style="font-size: 0.9rem; color: var(--text-color, #333); font-weight: 500;">✅ Continuar no endereço cadastrado</span>
                <button type="button" id="btn-open-map-modal-inner" style="background: none; border: none; color: var(--primary-color, #e91e63); font-weight: 600; cursor: pointer; text-decoration: underline; padding: 0;">Alterar</button>
            `;
            document.getElementById('btn-open-map-modal-inner').addEventListener('click', function(ev) {
                ev.preventDefault();
                window.openMapboxModal();
            });
        }
        goToStep(2); 
    });

    function updateEstimatedTime() {
        const estimatedTimeSpan = document.getElementById('estimated-time');
        if (!estimatedTimeSpan) return;

        let timeDelivery = CHECKOUT_CONFIG.times.delivery;
        let timePickup = CHECKOUT_CONFIG.times.pickup;
        
        const selectedDelivery = document.querySelector('input[name="delivery_option"]:checked');
        if (selectedDelivery) {
            estimatedTimeSpan.textContent = selectedDelivery.value === 'delivery' ? timeDelivery : timePickup;
        }
    }

    function toggleActionPanel() {
        const selected = document.querySelector('input[name="delivery_option"]:checked');
        if (actionPanel && cardDelivery) {
            if (selected && selected.value === 'delivery') {
                actionPanel.style.display = 'flex';
                cardDelivery.style.borderBottomLeftRadius = '0';
                cardDelivery.style.borderBottomRightRadius = '0';
                cardDelivery.style.borderBottom = 'none';
                cardDelivery.style.marginBottom = '0';
            } else {
                actionPanel.style.display = 'none';
                cardDelivery.style.borderBottomLeftRadius = '8px';
                cardDelivery.style.borderBottomRightRadius = '8px';
                cardDelivery.style.borderBottom = '1px solid var(--border-color, #ddd)';
                cardDelivery.style.marginBottom = '15px';
            }
        }
    }

    document.body.addEventListener('change', function(e) {
        if (e.target.name === 'delivery_option') {
            updateEstimatedTime();
            toggleActionPanel();
        }
        if (e.target.name === 'payment_method') togglePaymentFields();
    });

    updateEstimatedTime();
    setTimeout(toggleActionPanel, 100);

    function goToStep(step) {
        document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        stepDelivery.classList.add('hidden');
        stepPayment.classList.add('hidden');
        if (stepConclusion) stepConclusion.classList.add('hidden');

        if (step === 1) {
            stepDelivery.classList.remove('hidden');
            document.getElementById('step-indicator-1').classList.add('active');
        } else if (step === 2) {
            stepPayment.classList.remove('hidden');
            document.getElementById('step-indicator-1').classList.add('active');
            document.getElementById('step-indicator-2').classList.add('active');
        } else if (step === 3) {
            if (stepConclusion) stepConclusion.classList.remove('hidden');
            document.getElementById('step-indicator-1').classList.add('active');
            document.getElementById('step-indicator-2').classList.add('active');
            document.getElementById('step-indicator-3').classList.add('active');
        }
    }

    const creditDetails = document.getElementById('credit-card-details');
    const moneyDetails = document.getElementById('money-change-details');

    function togglePaymentFields() {
        if(creditDetails) creditDetails.classList.add('hidden');
        if(moneyDetails) moneyDetails.classList.add('hidden');
        const selectedRadio = document.querySelector('input[name="payment_method"]:checked');
        if (!selectedRadio) return; 

        if ((selectedRadio.value === 'credit' || selectedRadio.value === 'debit') && creditDetails) {
            creditDetails.classList.remove('hidden');
        } else if (selectedRadio.value === 'money' && moneyDetails) {
            moneyDetails.classList.remove('hidden');
        }
    }
    togglePaymentFields();

    if (btnOpenMap) {
        btnOpenMap.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            window.openMapboxModal();
        });
    }

    if (btnContinue1) {
        btnContinue1.addEventListener('click', function(e) {
            e.preventDefault();
            const deliveryRadio = document.querySelector('input[name="delivery_option"]:checked');
            if (!deliveryRadio) return alert("Selecione uma opção de entrega.");

            if (deliveryRadio.value === 'delivery') {
                if (precisaDeEndereco() || !window.dadosCompletos) {
                    window.openMapboxModal();
                } else if (!checkoutBairroIdInput.value) {
                    alert("Por favor, confirme seu endereço de entrega no mapa para calcularmos a taxa.");
                    window.openMapboxModal();
                } else {
                    goToStep(2);
                }
            } else {
                goToStep(2);
            }
        });
    }

    if (btnBack2) btnBack2.addEventListener('click', () => goToStep(1));

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            if (stepPayment.classList.contains('hidden')) {
                e.preventDefault();
                if (btnContinue1) btnContinue1.click();
                return;
            }

            e.preventDefault(); 
            const deliveryRadio = document.querySelector('input[name="delivery_option"]:checked');
            const paymentRadio = document.querySelector('input[name="payment_method"]:checked');

            if (!deliveryRadio || !paymentRadio) return alert("Selecione entrega e pagamento.");

            const payload = {
                delivery_option: deliveryRadio.value,
                schedule_option: 'now',
                payment_method: paymentRadio.value,
                bairro_id: checkoutBairroIdInput.value,
                card_brand: document.getElementById('card_brand') ? document.getElementById('card_brand').value : '',
                change_for: document.getElementById('change_for') ? document.getElementById('change_for').value : null
            };

            const submitBtn = checkoutForm.querySelector('#step-payment button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerText = "Processando...";

            fetch(CHECKOUT_CONFIG.urls.apiProcessarPedido, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': new FormData(checkoutForm).get('csrfmiddlewaretoken')
                },
                body: JSON.stringify(payload),
                credentials: 'same-origin'
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const successOrderId = document.getElementById('success-order-id');
                    const successAddress = document.getElementById('success-address');
                    const successPayment = document.getElementById('success-payment');
                    const successTotal = document.getElementById('success-total');
                    const successItems = document.getElementById('success-items');

                    if(successOrderId) successOrderId.innerText = `#${data.pedido_id}`;
                    if(successAddress) successAddress.innerText = data.endereco;
                    if(successPayment) successPayment.innerText = data.metodo_pagamento;
                    if(successTotal) successTotal.innerText = `R$ ${parseFloat(data.total).toFixed(2).replace('.', ',')}`;
                    
                    if(successItems) {
                        successItems.innerHTML = '';
                        if (Array.isArray(data.itens)) {
                            data.itens.forEach(item => {
                                const li = document.createElement('li');
                                li.innerText = item; 
                                successItems.appendChild(li);
                            });
                        }
                    }
                    goToStep(3);
                } else {
                    alert('Erro: ' + (data.error || 'Erro desconhecido.'));
                }
            })
            .catch(err => alert('Erro de conexão.'))
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            });
        });
    }
});