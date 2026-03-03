// static/js/checkout.js

document.addEventListener("DOMContentLoaded", function() {
    
    console.log("🚀 CHECKOUT.JS CARREGADO!");

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
    console.log("🛠️ Estado Inicial - dadosCompletos:", dadosCompletos);

    // ADICIONADO: Função salva-vidas - verifica VISUALMENTE se o endereço não existe
    function precisaDeEndereco() {
        if (addressDisplay) {
            let textoEnd = addressDisplay.innerText.toLowerCase();
            let precisa = textoEnd.includes('informe');
            console.log("🔎 Verificando visualmente endereço. Texto atual:", textoEnd, "| Precisa de endereço?", precisa);
            return precisa;
        }
        return false;
    }

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
            console.log("🔄 Mudou opção de entrega para:", e.target.value);
            updateEstimatedTime();
            
            // ADICIONADO: Força abrir se clicar em "Receber" e faltar o endereço na tela
            if (e.target.value === 'delivery' && (precisaDeEndereco() || !dadosCompletos)) {
                console.log("🚨 Usuário clicou em 'Delivery' mas falta endereço. Abrindo modal imediatamente!");
                openModal();
            }
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
        console.log("➡️ Avançando para o step:", step);
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
        console.log("=====================================");
        console.log("🌟 FUNÇÃO openModal() FOI INVOCADA!");
        console.log("=====================================");
        if(modal) {
            modal.classList.add('active');
            // Força bruta via JS para caso o CSS esteja sendo sobrescrito por outro arquivo
            modal.style.display = 'flex';
            modal.style.zIndex = '999999';
            console.log("✅ Classes atuais do modal:", modal.className);
        } else {
            console.error("❌ ERRO GRAVE: O elemento 'full-register-modal' não foi encontrado no HTML!");
        }
    }

    function closeModalFunc() {
        console.log("Fechar modal invocado.");
        if(modal) {
            modal.classList.remove('active');
            modal.style.display = ''; // Limpa o estilo em linha
        }
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
        btnContinue1.addEventListener('click', function(e) {
            // PREVENT DEFAULT ADICIONADO: Impede que o botão tente submeter formulários acidentalmente
            e.preventDefault();
            console.log("Botão 'Continuar para Pagamento' clicado.");

            const deliveryRadio = document.querySelector('input[name="delivery_option"]:checked');
            if (!deliveryRadio) {
                alert("Desculpe, não há opções de entrega ou retirada disponíveis no momento.");
                return;
            }

            const deliveryOption = deliveryRadio.value;
            console.log("Opção selecionada no clique:", deliveryOption);

            // ADICIONADO: Usa a função visual (precisaDeEndereco) para garantir a abertura
            if (deliveryOption === 'delivery' && (precisaDeEndereco() || !dadosCompletos)) {
                console.log("Detectou que precisa de endereço. Abrindo modal antes de prosseguir...");
                openModal();
            } else {
                console.log("Dados completos, indo para Passo 2...");
                goToStep(2);
            }
        });
    } else {
        console.error("❌ ERRO: Botão btn-continue-step1 não encontrado!");
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
            console.log("📝 Formulário do Modal de Endereço submetido!");
            
            const formData = new FormData(registerForm);
            
            // ADICIONADO: Inclui o ID do usuário no FormData via JS por precaução
            if (typeof CHECKOUT_CONFIG !== 'undefined' && CHECKOUT_CONFIG.user && CHECKOUT_CONFIG.user.id) {
                formData.append('usuario_id', CHECKOUT_CONFIG.user.id);
            }

            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            
            submitBtn.disabled = true;
            submitBtn.innerText = "Salvando...";

            fetch(CHECKOUT_CONFIG.urls.apiSalvarDados, { 
                method: 'POST',
                body: formData,
                headers: { 'X-CSRFToken': formData.get('csrfmiddlewaretoken') },
                credentials: 'same-origin' // ADICIONADO: Para segurança de sessão Django
            })
            .then(response => response.json())
            .then(data => {
                if(data.success) {
                    console.log("✅ Dados salvos com sucesso via API.");
                    dadosCompletos = true;
                    if (addressDisplay && data.endereco) {
                        addressDisplay.innerHTML = `${data.endereco.logradouro}, ${data.endereco.numero} - ${data.endereco.bairro}`;
                        addressDisplay.classList.remove('text-muted');
                    }
                    closeModalFunc();
                    goToStep(2); 
                } else {
                    console.error("❌ Erro da API ao salvar:", data.errors);
                    alert('Erro ao salvar: ' + JSON.stringify(data.errors));
                }
            })
            .catch(err => {
                console.error('❌ Erro no fetch de salvamento:', err);
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
            
            // ADICIONADO: Previne submissão caso o usuário aperte "Enter" na etapa 1 
            // (evita a tooltip "Preencha este campo" nos inputs ocultos)
            if (stepPayment.classList.contains('hidden')) {
                e.preventDefault();
                console.log("Tentou submeter o form na etapa 1. Redirecionando clique para o botão Continuar.");
                if (btnContinue1) btnContinue1.click();
                return;
            }

            e.preventDefault(); 
            console.log("💰 Iniciando processo de finalização do pedido...");

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
                body: JSON.stringify(payload),
                credentials: 'same-origin' // ADICIONADO: Para segurança de sessão Django
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log("✅ Pedido finalizado com sucesso!");
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
                    console.error("❌ Erro da API no pedido:", data.error);
                    alert('Erro ao processar pedido: ' + (data.error || 'Erro desconhecido.'));
                }
            })
            .catch(err => {
                console.error('❌ Erro no fetch de finalizar pedido:', err);
                alert('Erro de conexão. Verifique sua internet e tente novamente.');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            });
        });
    }
});