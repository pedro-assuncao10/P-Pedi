// static/js/checkout.js

document.addEventListener("DOMContentLoaded", function() {
    
    // === 1. Referências aos Elementos ===
    const btnContinue1 = document.getElementById('btn-continue-step1');
    const btnBack2 = document.getElementById('btn-back-step2');
    
    // Elementos do Modal de Cadastro
    const modal = document.getElementById('full-register-modal');
    const closeModal = document.getElementById('btn-close-modal');
    const registerForm = document.getElementById('full-register-form');
    
    // Elementos de Exibição / Steps
    const addressDisplay = document.getElementById('address-display');
    const stepDelivery = document.getElementById('step-delivery');
    const stepPayment = document.getElementById('step-payment');
    
    // Elementos Etapa 3
    const stepConclusion = document.getElementById('step-conclusion');
    const successOrderId = document.getElementById('success-order-id');
    const successAddress = document.getElementById('success-address');
    const successPayment = document.getElementById('success-payment');
    const successTotal = document.getElementById('success-total');
    const successItems = document.getElementById('success-items');

    // === ELEMENTOS EXTRAS DE PAGAMENTO ===
    const cardBrandSelect = document.getElementById('card_brand');
    const changeForInput = document.getElementById('change_for');
    const checkoutForm = document.getElementById('checkout-form');

    // === 2. Estado Inicial ===
    let dadosCompletos = (typeof CHECKOUT_CONFIG !== 'undefined' && CHECKOUT_CONFIG.user) ? CHECKOUT_CONFIG.user.dadosCompletos : false;

    // === Lógica Condicional de Tempo de Entrega/Retirada ===
    function updateEstimatedTime() {
        const estimatedTimeSpan = document.getElementById('estimated-time');
        if (!estimatedTimeSpan) return;

        // Valores padrão de segurança caso a variável não exista no HTML
        let timeDelivery = "40-60 min";
        let timePickup = "30-40 min";

        // Tenta pegar os tempos dinâmicos vindos do backend via CHECKOUT_CONFIG
        if (typeof CHECKOUT_CONFIG !== 'undefined' && CHECKOUT_CONFIG.times) {
            timeDelivery = CHECKOUT_CONFIG.times.delivery || timeDelivery;
            timePickup = CHECKOUT_CONFIG.times.pickup || timePickup;
        }
        
        const selectedDelivery = document.querySelector('input[name="delivery_option"]:checked');
        if (selectedDelivery) {
            if (selectedDelivery.value === 'delivery') {
                estimatedTimeSpan.textContent = timeDelivery;
            } else if (selectedDelivery.value === 'pickup') {
                estimatedTimeSpan.textContent = timePickup;
            }
        }
    }

    // Listener global para capturar mudanças nos botões de rádio (Mais seguro contra falhas/cache parcial)
    document.body.addEventListener('change', function(e) {
        if (e.target.name === 'delivery_option') {
            updateEstimatedTime();
        }
        if (e.target.name === 'payment_method') {
            togglePaymentFields();
        }
    });

    // Fallback Extra: Adiciona evento de 'click' nas labels inteiras (útil para mobile)
    document.querySelectorAll('.option-card').forEach(card => {
        card.addEventListener('click', () => {
            setTimeout(() => {
                updateEstimatedTime();
                togglePaymentFields();
            }, 50);
        });
    });

    // Chama na inicialização para exibir o tempo correto da opção marcada por padrão
    updateEstimatedTime();

    // === 3. Funções Auxiliares ===
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

    function openModal() {
        if(modal) modal.classList.add('active');
    }

    function closeModalFunc() {
        if(modal) modal.classList.remove('active');
    }

    // === Lógica Condicional de Pagamento ===
    const creditDetails = document.getElementById('credit-card-details');
    const moneyDetails = document.getElementById('money-change-details');

    function togglePaymentFields() {
        if(creditDetails) creditDetails.classList.add('hidden');
        if(moneyDetails) moneyDetails.classList.add('hidden');

        const selectedRadio = document.querySelector('input[name="payment_method"]:checked');
        if (!selectedRadio) return; 

        let selected = selectedRadio.value;

        if ((selected === 'credit' || selected === 'debit') && creditDetails) {
            creditDetails.classList.remove('hidden');
        } else if (selected === 'money' && moneyDetails) {
            moneyDetails.classList.remove('hidden');
        }
    }

    togglePaymentFields();

    // === 5. Event Listeners de Navegação ===
    if (btnContinue1) {
        btnContinue1.addEventListener('click', function() {
            const deliveryRadio = document.querySelector('input[name="delivery_option"]:checked');
            if (!deliveryRadio) {
                alert("Desculpe, não há opções de entrega ou retirada disponíveis no momento.");
                return;
            }

            const deliveryOption = deliveryRadio.value;

            // Se for delivery e o cliente não tiver dados completos, força preencher endereço
            if (deliveryOption === 'delivery' && !dadosCompletos) {
                openModal();
            } else {
                goToStep(2);
            }
        });
    }

    if (btnBack2) {
        btnBack2.addEventListener('click', () => goToStep(1));
    }

    // Modal Events
    if (closeModal) closeModal.addEventListener('click', closeModalFunc);
    if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) closeModalFunc(); });

    // === 6. Envio do Formulário de Cadastro (Modal) ===
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(registerForm);
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            
            submitBtn.disabled = true;
            submitBtn.innerText = "Salvando...";

            fetch(CHECKOUT_CONFIG.urls.apiSalvarDados, { 
                method: 'POST',
                body: formData,
                headers: { 'X-CSRFToken': formData.get('csrfmiddlewaretoken') }
            })
            .then(response => response.json())
            .then(data => {
                if(data.success) {
                    dadosCompletos = true;
                    if (addressDisplay && data.endereco) {
                        addressDisplay.innerHTML = `${data.endereco.logradouro}, ${data.endereco.numero} - ${data.endereco.bairro}`;
                        addressDisplay.classList.remove('text-muted');
                    }
                    closeModalFunc();
                    goToStep(2); 
                } else {
                    alert('Erro ao salvar: ' + JSON.stringify(data.errors));
                }
            })
            .catch(err => {
                console.error('Erro:', err);
                alert('Ocorreu um erro ao tentar salvar seus dados.');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            });
        });
    }

    // === 7. FINALIZAR PEDIDO ===
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            
            if (stepPayment.classList.contains('hidden')) return;
            e.preventDefault(); 

            const deliveryRadio = document.querySelector('input[name="delivery_option"]:checked');
            const paymentRadio = document.querySelector('input[name="payment_method"]:checked');

            if (!deliveryRadio || !paymentRadio) {
                alert("Erro: Certifique-se de que selecionou o método de entrega e pagamento.");
                return;
            }

            const deliveryOption = deliveryRadio.value;
            const paymentMethod = paymentRadio.value;
            
            // O valor é fixo para "agora" já que escondemos o agendamento
            const scheduleOption = 'now';
            let scheduledTimeValue = null;

            let cardBrandValue = '';
            let changeForValue = null;

            if (paymentMethod === 'credit' || paymentMethod === 'debit') {
                cardBrandValue = cardBrandSelect ? cardBrandSelect.value : '';
                if (!cardBrandValue) {
                    alert("Por favor, selecione a bandeira do cartão.");
                    return;
                }
            } else if (paymentMethod === 'money') {
                changeForValue = changeForInput ? changeForInput.value : null;
            }

            const submitBtn = checkoutForm.querySelector('#step-payment button[type="submit"]');
            const originalText = submitBtn.innerText;
            
            submitBtn.disabled = true;
            submitBtn.innerText = "Processando...";

            const formData = new FormData(checkoutForm);
            
            const payload = {
                delivery_option: deliveryOption,
                schedule_option: scheduleOption,
                scheduled_time: scheduledTimeValue,
                payment_method: paymentMethod,
                card_brand: cardBrandValue,
                change_for: changeForValue
            };

            fetch(CHECKOUT_CONFIG.urls.apiProcessarPedido, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': formData.get('csrfmiddlewaretoken')
                },
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if(successOrderId) successOrderId.innerText = `#${data.pedido_id}`;
                    if(successAddress) successAddress.innerText = data.endereco;
                    if(successPayment) successPayment.innerText = data.metodo_pagamento;
                    
                    if(successTotal) {
                        successTotal.innerText = `R$ ${parseFloat(data.total).toFixed(2).replace('.', ',')}`;
                    }
                    
                    if(successItems) {
                        successItems.innerHTML = '';
                        if (data.itens && Array.isArray(data.itens)) {
                            data.itens.forEach(item => {
                                const li = document.createElement('li');
                                li.innerText = item; 
                                successItems.appendChild(li);
                            });
                        }
                    }
                    goToStep(3);
                } else {
                    alert('Erro ao processar pedido: ' + (data.error || 'Erro desconhecido.'));
                }
            })
            .catch(err => {
                console.error(err);
                alert('Erro de conexão. Verifique sua internet e tente novamente.');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            });
        });
    }
});