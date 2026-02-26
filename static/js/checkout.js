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
    
    // === NOVOS ELEMENTOS (ETAPA 3 - CONCLUSÃO) ===
    const stepConclusion = document.getElementById('step-conclusion');
    const successOrderId = document.getElementById('success-order-id');
    const successAddress = document.getElementById('success-address');
    const successPayment = document.getElementById('success-payment');
    const successTotal = document.getElementById('success-total');
    const successItems = document.getElementById('success-items');

    // === ELEMENTOS DE AGENDAMENTO ===
    const scheduleRadios = document.querySelectorAll('input[name="schedule_option"]');
    const scheduleContainer = document.getElementById('schedule-container');
    const scheduleInput = document.getElementById('scheduled_time');

    // === ELEMENTOS EXTRAS DE PAGAMENTO ===
    const cardBrandSelect = document.getElementById('card_brand');
    const changeForInput = document.getElementById('change_for');
    // Campo de observação global foi removido

    // Formulário Principal
    const checkoutForm = document.getElementById('checkout-form');

    // === 2. Estado Inicial (Vindo do HTML) ===
    let dadosCompletos = CHECKOUT_CONFIG.user.dadosCompletos;

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

    // === 4. Lógica de Agendamento ===
    if (scheduleRadios.length > 0) {
        scheduleRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'schedule') {
                    if (scheduleContainer) scheduleContainer.classList.remove('hidden');
                    if (scheduleInput) scheduleInput.focus();
                } else {
                    if (scheduleContainer) scheduleContainer.classList.add('hidden');
                    if (scheduleInput) scheduleInput.value = '';
                }
            });
        });
    }

    // === 5. Event Listeners de Navegação ===

    if (btnContinue1) {
        btnContinue1.addEventListener('click', function() {
            const deliveryOption = document.querySelector('input[name="delivery_option"]:checked').value;
            const scheduleOption = document.querySelector('input[name="schedule_option"]:checked').value;

            if (scheduleOption === 'schedule') {
                const timeVal = scheduleInput ? scheduleInput.value : '';
                if (!timeVal) {
                    alert("Por favor, selecione uma data e horário para o agendamento.");
                    if(scheduleInput) scheduleInput.focus();
                    return; 
                }
            }

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

    if (closeModal) {
        closeModal.addEventListener('click', closeModalFunc);
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModalFunc();
        });
    }

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
                headers: { 
                    'X-CSRFToken': formData.get('csrfmiddlewaretoken') 
                }
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

            const deliveryOption = document.querySelector('input[name="delivery_option"]:checked').value;
            const scheduleOption = document.querySelector('input[name="schedule_option"]:checked').value;
            const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
            
            let scheduledTimeValue = null;
            if (scheduleOption === 'schedule' && scheduleInput) {
                scheduledTimeValue = scheduleInput.value;
                if (!scheduledTimeValue) {
                    alert("Data de agendamento inválida. Por favor, volte e selecione um horário.");
                    goToStep(1);
                    return;
                }
            }

            let cardBrandValue = '';
            let changeForValue = null;

            if (paymentMethod === 'credit') {
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
            
            // Payload limpo sem a observacao geral
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
                                li.innerText = item; // Aqui já virá concatenado com a observação se houver!
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