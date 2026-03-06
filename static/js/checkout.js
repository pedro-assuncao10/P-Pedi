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
    const btnSaveAddress = document.getElementById('btn-save-address');
    
    // NOVO: Referências do Painel de Ação
    const btnOpenMap = document.getElementById('btn-open-map-modal');
    const actionPanel = document.getElementById('delivery-action-panel');
    const cardDelivery = document.getElementById('card-delivery');
    
    // Elementos de Exibição / Steps
    const addressDisplay = document.getElementById('address-display');
    const stepDelivery = document.getElementById('step-delivery');
    const stepPayment = document.getElementById('step-payment');
    const stepConclusion = document.getElementById('step-conclusion');
    
    // Inputs Ocultos e Vitais
    const checkoutBairroIdInput = document.getElementById('checkout_bairro_id');
    const modalBairroIdInput = document.getElementById('modal_bairro_id');
    const inputModalBairro = document.getElementById('modal_bairro'); // Campo de bairro visível
    
    // === 2. Estado Inicial ===
    let dadosCompletos = (typeof CHECKOUT_CONFIG !== 'undefined' && CHECKOUT_CONFIG.user) ? CHECKOUT_CONFIG.user.dadosCompletos : false;

    function precisaDeEndereco() {
        if (addressDisplay) {
            let textoEnd = addressDisplay.innerText.toLowerCase();
            return textoEnd.includes('informe');
        }
        return false;
    }

    // Monitora a digitação manual do bairro caso o mapa não encontre
    if (inputModalBairro) {
        inputModalBairro.addEventListener('input', function(e) {
            // Só faz a validação ao digitar se o campo estiver liberado (quando o mapa falha)
            if (!this.readOnly) {
                validarBairroLogistica(e.target.value);
            }
        });
    }

    // === 3. LÓGICA DO MAPBOX (ESTILO IFOOD) ===
    let map = null;
    let geocoder = null;
    let moveTimeout = null;

    function initMapbox() {
        // Validação estrita do Token
        if (!CHECKOUT_CONFIG.mapboxToken || CHECKOUT_CONFIG.mapboxToken.trim() === "" || CHECKOUT_CONFIG.mapboxToken.includes("SEU_MAPBOX")) {
            console.error("⚠️ MAPBOX TOKEN INVÁLIDO OU NÃO CONFIGURADO.");
            alert("Erro de Sistema: O mapa não pode ser carregado pois a chave de API (Token) está ausente.");
            return;
        }

        mapboxgl.accessToken = CHECKOUT_CONFIG.mapboxToken;
        
        // Coordenada inicial (São Luís/MA como padrão, mude se necessário)
        const initialCoords = [-44.3068, -2.5297]; 

        map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: initialCoords,
            zoom: 15
        });

        // Forçar o resize múltiplas vezes para garantir que o mapa preencha o modal (corrige o bug da tela cinza/branca)
        map.on('load', () => {
            map.resize();
            setTimeout(() => map.resize(), 200);
            setTimeout(() => map.resize(), 500);
        });

        const geocoderContainer = document.getElementById('geocoder-container');
        geocoderContainer.innerHTML = ''; // Limpa caso seja chamado duas vezes

        // 1. Barra de Pesquisa (Autocomplete estilo Google/iFood)
        geocoder = new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl,
            marker: false, // Sem marcador padrão, já temos o pino rosa no CSS
            placeholder: 'Endereço e número...',
            countries: 'br', // Apenas Brasil
            types: 'address,poi,neighborhood',
            language: 'pt-BR'
        });

        geocoderContainer.appendChild(geocoder.onAdd(map));

        // 2. Criando o botão "Usar Localização Atual" dinamicamente abaixo da barra
        const btnCurrentLocation = document.createElement('div');
        btnCurrentLocation.className = 'current-location-btn';
        btnCurrentLocation.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; color: #e91e63;"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
            <span>Usar localização atual</span>
        `;
        // Estilização do botão
        btnCurrentLocation.style.cssText = "display: flex; align-items: center; padding: 12px; background: #fff; border: 1px solid #ddd; border-radius: 8px; margin-top: 5px; cursor: pointer; font-weight: 500; color: #e91e63; font-size: 0.9rem; transition: background 0.2s;";
        
        btnCurrentLocation.addEventListener('mouseover', () => btnCurrentLocation.style.background = '#fcfcfc');
        btnCurrentLocation.addEventListener('mouseout', () => btnCurrentLocation.style.background = '#fff');

        // Ação do botão de GPS
        btnCurrentLocation.addEventListener('click', () => {
            if ("geolocation" in navigator) {
                const statusBox = document.getElementById('delivery-status');
                statusBox.className = 'delivery-status-box';
                statusBox.innerText = 'Buscando sinal do GPS...';
                statusBox.style.display = 'block';

                navigator.geolocation.getCurrentPosition(position => {
                    // Move o mapa para o GPS do usuário, isso vai disparar o 'moveend' automaticamente
                    map.flyTo({ 
                        center: [position.coords.longitude, position.coords.latitude], 
                        zoom: 16,
                        essential: true 
                    });
                }, error => {
                    statusBox.className = 'delivery-status-box status-error';
                    statusBox.innerText = 'Permissão de GPS negada. Por favor, digite o endereço na barra de busca.';
                }, { enableHighAccuracy: true });
            } else {
                alert("Seu navegador não suporta geolocalização.");
            }
        });

        geocoderContainer.appendChild(btnCurrentLocation);

        // Quando o usuário clica numa sugestão da busca do autocomplete
        geocoder.on('result', function(e) {
            map.flyTo({ center: e.result.center, zoom: 16 });
            // O moveend cuidará de atualizar os campos do formulário
        });

        // Quando o usuário termina de arrastar o mapa (com "debounce" para não floodar a API)
        map.on('moveend', function() {
            clearTimeout(moveTimeout);
            moveTimeout = setTimeout(() => {
                const center = map.getCenter();
                atualizarEnderecoViaCoordenadas(center.lng, center.lat);
            }, 300);
        });
    }

    // Função que converte as coordenadas do centro do mapa para endereço e valida a zona
    function atualizarEnderecoViaCoordenadas(lng, lat) {
        document.getElementById('modal_lng').value = lng;
        document.getElementById('modal_lat').value = lat;
        
        const statusBox = document.getElementById('delivery-status');
        statusBox.className = 'delivery-status-box';
        statusBox.innerHTML = 'Buscando endereço <span style="animation: pulse 1s infinite;">...</span>';
        statusBox.style.display = 'block';
        btnSaveAddress.disabled = true;

        // URL ATUALIZADA: Sem restrição de 'types' para o Mapbox devolver TUDO, e forçando pt-BR.
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&language=pt-BR`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.features && data.features.length > 0) {
                    let rua = "", bairro = "", cidade = "", cep = "";
                    let numeroExtraido = "";

                    // A feature principal (índice 0) é a mais específica encontrada (ex: O endereço exato ou rua)
                    const principal = data.features[0];

                    // 1. Tenta extrair analisando todas as features da resposta principal
                    data.features.forEach(feature => {
                        if (feature.id.includes('address') && !rua) {
                            rua = feature.text;
                            if(feature.address) numeroExtraido = feature.address; 
                        } else if (feature.id.includes('neighborhood') && !bairro) {
                            bairro = feature.text;
                        } else if (feature.id.includes('locality') && !bairro) {
                            bairro = feature.text; // Fallback caso bairro seja mapeado como localidade
                        } else if (feature.id.includes('place') && !cidade) {
                            cidade = feature.text;
                        } else if (feature.id.includes('postcode') && !cep) {
                            cep = feature.text;
                        }
                    });

                    // 2. LÓGICA SALVA-VIDAS: No Brasil, o Mapbox costuma "esconder" o bairro e cidade dentro do array 'context' da feature principal.
                    if (principal && principal.context) {
                        principal.context.forEach(c => {
                            if (c.id.includes('neighborhood') && !bairro) bairro = c.text;
                            if (c.id.includes('locality') && !bairro) bairro = c.text;
                            if (c.id.includes('place') && !cidade) cidade = c.text;
                            if (c.id.includes('postcode') && !cep) cep = c.text;
                            
                            // Extrai o UF (Estado) para preencher o input escondido
                            if (c.id.includes('region') && c.short_code) {
                                const uf = c.short_code.split('-')[1]; // Transforma "BR-MA" em "MA"
                                const estadoInput = document.getElementById('modal_estado');
                                if (estadoInput) estadoInput.value = uf;
                            }
                        });
                    }

                    // Preencher formulário visualmente
                    document.getElementById('modal_logradouro').value = rua || "Rua não identificada";
                    if(numeroExtraido && !document.getElementById('modal_numero').value) {
                        document.getElementById('modal_numero').value = numeroExtraido;
                    }
                    
                    document.getElementById('modal_cidade').value = cidade;
                    
                    const cepInput = document.getElementById('modal_cep');
                    if (cepInput && cep) cepInput.value = cep;
                    
                    // LÓGICA DE LIBERAÇÃO MANUAL DO BAIRRO
                    if (inputModalBairro) {
                        inputModalBairro.value = bairro;
                        
                        if (bairro && bairro.trim() !== "") {
                            // Achou o bairro: Bloqueia a digitação e valida direto
                            inputModalBairro.setAttribute('readonly', true);
                            inputModalBairro.style.backgroundColor = '#f5f5f5';
                            inputModalBairro.placeholder = '';
                            validarBairroLogistica(bairro);
                        } else {
                            // Não achou o bairro: Libera para o cliente digitar e aguarda
                            inputModalBairro.removeAttribute('readonly');
                            inputModalBairro.style.backgroundColor = '#fff';
                            inputModalBairro.placeholder = 'Digite seu bairro aqui...';
                            
                            statusBox.className = 'delivery-status-box status-error';
                            statusBox.innerHTML = '⚠️ Não achamos seu bairro. Por favor, <b>digite-o manualmente</b> no campo abaixo.';
                            
                            modalBairroIdInput.value = '';
                            checkoutBairroIdInput.value = '';
                            btnSaveAddress.disabled = true;
                        }
                    }

                } else {
                    statusBox.className = 'delivery-status-box status-error';
                    statusBox.innerText = 'Não conseguimos identificar esta rua. Tente aproximar o mapa.';
                }
            })
            .catch(err => {
                console.error("Erro ao buscar endereço:", err);
                statusBox.className = 'delivery-status-box status-error';
                statusBox.innerText = 'Erro de conexão ao buscar endereço.';
            });
    }

    // Compara o bairro do Mapbox (ou digitado) com os bairros que a loja atende
    function validarBairroLogistica(nomeBairroMapbox) {
        const statusBox = document.getElementById('delivery-status');
        
        if (!nomeBairroMapbox || nomeBairroMapbox.trim() === '') {
            statusBox.className = 'delivery-status-box status-error';
            statusBox.innerHTML = '⚠️ Digite o nome do bairro para verificarmos se entregamos aí.';
            modalBairroIdInput.value = '';
            checkoutBairroIdInput.value = '';
            btnSaveAddress.disabled = true;
            return;
        }

        // Limpa acentos e deixa minúsculo para a comparação ser perfeita
        const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const bairroBuscado = normalize(nomeBairroMapbox);

        // Busca flexível: verifica se a palavra do DB está no input ou vice-versa
        const bairroEncontrado = BAIRROS_LOGISTICA.find(b => {
            const nomeDb = normalize(b.nome);
            return bairroBuscado.includes(nomeDb) || nomeDb.includes(bairroBuscado);
        });

        if (bairroEncontrado) {
            // Sucesso! Loja atende.
            statusBox.className = 'delivery-status-box status-success';
            statusBox.innerText = `✅ Entregamos no ${bairroEncontrado.nome} (Taxa: R$ ${bairroEncontrado.taxa.toFixed(2).replace('.', ',')})`;
            
            modalBairroIdInput.value = bairroEncontrado.id;
            checkoutBairroIdInput.value = bairroEncontrado.id;
            
            btnSaveAddress.disabled = false;
        } else {
            // Falha! Loja não atende.
            statusBox.className = 'delivery-status-box status-error';
            statusBox.innerHTML = `❌ Desculpe, não entregamos em <b>${nomeBairroMapbox}</b>.<br><small>Tente buscar por outro nome ou região.</small>`;
            
            modalBairroIdInput.value = '';
            checkoutBairroIdInput.value = '';
            btnSaveAddress.disabled = true;
        }
    }


    // === Lógica Condicional de Tempo e Interface ===
    function updateEstimatedTime() {
        const estimatedTimeSpan = document.getElementById('estimated-time');
        if (!estimatedTimeSpan) return;

        let timeDelivery = "40-60 min", timePickup = "30-40 min";

        if (typeof CHECKOUT_CONFIG !== 'undefined' && CHECKOUT_CONFIG.times) {
            timeDelivery = CHECKOUT_CONFIG.times.delivery || timeDelivery;
            timePickup = CHECKOUT_CONFIG.times.pickup || timePickup;
        }
        
        const selectedDelivery = document.querySelector('input[name="delivery_option"]:checked');
        if (selectedDelivery) {
            estimatedTimeSpan.textContent = selectedDelivery.value === 'delivery' ? timeDelivery : timePickup;
        }
    }

    // Lógica para mostrar/esconder o novo painel de ação
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
            // REMOVIDA: Lógica de abrir modal automaticamente. Agora o usuário clica no botão "Adicionar".
        }
        if (e.target.name === 'payment_method') togglePaymentFields();
    });

    updateEstimatedTime();
    setTimeout(toggleActionPanel, 100);

    // === Navegação e Modais ===
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

    // ESTA É A FUNÇÃO QUE INICIALIZA O MAPBOX
    function openModal() {
        if(modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
            
            // Instancia o mapa se for a primeira vez
            if (!map) {
                initMapbox();
            } else {
                // Resize necessário pois o mapa estava com display:none
                setTimeout(() => { map.resize(); }, 200);
            }
        }
    }

    function closeModalFunc() {
        if(modal) {
            modal.classList.remove('active');
            modal.style.display = ''; 
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

    // === Eventos de Botão ===

    // ABRIR MAPA PELO NOVO BOTÃO DO PAINEL
    if (btnOpenMap) {
        btnOpenMap.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openModal(); // Chama a função que garante o carregamento do Mapbox
        });
    }

    // BOTÃO "CONTINUAR PARA PAGAMENTO"
    if (btnContinue1) {
        btnContinue1.addEventListener('click', function(e) {
            e.preventDefault();
            const deliveryRadio = document.querySelector('input[name="delivery_option"]:checked');
            if (!deliveryRadio) return alert("Selecione uma opção de entrega.");

            if (deliveryRadio.value === 'delivery') {
                if (precisaDeEndereco() || !dadosCompletos) {
                    openModal();
                } else if (!checkoutBairroIdInput.value) {
                    alert("Por favor, confirme seu endereço de entrega no mapa para calcularmos a taxa.");
                    openModal();
                } else {
                    goToStep(2);
                }
            } else {
                goToStep(2);
            }
        });
    }

    if (btnBack2) btnBack2.addEventListener('click', () => goToStep(1));
    if (closeModal) closeModal.addEventListener('click', closeModalFunc);

    // === Salvando o Endereço (Modal Mapbox) ===
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!modalBairroIdInput.value) {
                alert("O bairro selecionado não é atendido pela loja.");
                return;
            }

            const formData = new FormData(registerForm);
            
            btnSaveAddress.disabled = true;
            btnSaveAddress.innerText = "Salvando...";

            fetch(CHECKOUT_CONFIG.urls.apiSalvarDados, { 
                method: 'POST',
                body: formData,
                headers: { 'X-CSRFToken': formData.get('csrfmiddlewaretoken') },
                credentials: 'same-origin'
            })
            .then(response => response.json())
            .then(data => {
                if(data.success) {
                    dadosCompletos = true;
                    // Atualiza a UI para o usuário ver o endereço salvo
                    if (addressDisplay) {
                        const log = document.getElementById('modal_logradouro').value;
                        const num = document.getElementById('modal_numero').value;
                        const brr = document.getElementById('modal_bairro').value;
                        addressDisplay.innerHTML = `${log}, ${num} - ${brr}`;
                        addressDisplay.classList.remove('text-muted');
                    }
                    
                    // Transforma o botão visualmente
                    if(actionPanel) {
                        actionPanel.innerHTML = `
                            <span style="font-size: 0.9rem; color: var(--text-color, #333); font-weight: 500;">✅ Continuar no endereço cadastrado</span>
                            <button type="button" id="btn-open-map-modal" style="background: none; border: none; color: var(--primary-color, #e91e63); font-weight: 600; cursor: pointer; text-decoration: underline; font-family: inherit; padding: 0;">Alterar</button>
                        `;
                        // Reatribui o evento de click, pois o HTML do painel foi reescrito
                        document.getElementById('btn-open-map-modal').addEventListener('click', function(ev) {
                            ev.preventDefault();
                            openModal();
                        });
                    }

                    closeModalFunc();
                    goToStep(2); 
                } else {
                    alert('Erro ao salvar: ' + JSON.stringify(data.errors));
                }
            })
            .catch(err => {
                console.error('Erro:', err);
                alert('Erro ao salvar seus dados.');
            })
            .finally(() => {
                btnSaveAddress.disabled = false;
                btnSaveAddress.innerText = "Confirmar Endereço";
            });
        });
    }

    // === Finalizando Pedido ===
    const checkoutForm = document.getElementById('checkout-form');
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
            .then(response => response.json())
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