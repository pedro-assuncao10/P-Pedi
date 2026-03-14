console.log("📦 MODAL_MAPBOX.JS CARREGADO!");

window._mapInitialized = false;
window._mapboxMap = null;
let geocoder = null;
let moveTimeout = null;

window.openMapboxModal = function() {
    const modal = document.getElementById('full-register-modal');
    if(modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        if (!window._mapInitialized) {
            initMapboxModal();
            window._mapInitialized = true;
        } else {
            setTimeout(() => window._mapboxMap.resize(), 200);
        }
    }
};

window.closeMapboxModal = function() {
    const modal = document.getElementById('full-register-modal');
    if(modal) {
        modal.classList.remove('active');
        modal.style.display = '';
    }
};

function initMapboxModal() {
    if (!CHECKOUT_CONFIG.mapboxToken || CHECKOUT_CONFIG.mapboxToken.trim() === "") {
        console.error("⚠️ MAPBOX TOKEN INVÁLIDO."); return;
    }
    mapboxgl.accessToken = CHECKOUT_CONFIG.mapboxToken;
    
    const initialLng = CHECKOUT_CONFIG.lojaLng || -47.9292;
    const initialLat = CHECKOUT_CONFIG.lojaLat || -15.7801;
    const initialCoords = [initialLng, initialLat]; 

    window._mapboxMap = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: initialCoords,
        zoom: 13 
    });

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(pos => {
            const userCoords = [pos.coords.longitude, pos.coords.latitude];
            window._mapboxMap.setCenter(userCoords);
            window._mapboxMap.setZoom(16); // Aumentei o zoom inicial do GPS
            
            if (geocoder) {
                geocoder.setProximity({
                    longitude: pos.coords.longitude,
                    latitude: pos.coords.latitude
                });
            }
        });
    }

    window._mapboxMap.on('load', () => {
        window._mapboxMap.resize();
        setTimeout(() => window._mapboxMap.resize(), 300);
    });

    const geocoderContainer = document.getElementById('geocoder-container');
    geocoderContainer.innerHTML = ''; 

    geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        marker: false,
        placeholder: 'Pesquise Rua, Bairro ou Cidade...',
        countries: 'br', 
        proximity: {
            longitude: initialLng,
            latitude: initialLat
        },
        types: 'address,poi,neighborhood,locality,place', 
        language: 'pt-BR'
    });
    geocoderContainer.appendChild(geocoder.onAdd(window._mapboxMap));

    const btnCurrentLocation = document.createElement('div');
    btnCurrentLocation.className = 'current-location-btn';
    btnCurrentLocation.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; color: #e91e63;"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg><span>Usar localização atual</span>`;
    btnCurrentLocation.style.cssText = "display: flex; align-items: center; padding: 12px; background: #fff; border: 1px solid #ddd; border-radius: 8px; margin-top: 5px; cursor: pointer; font-weight: 500; color: #e91e63; font-size: 0.9rem; transition: background 0.2s;";
    
    btnCurrentLocation.addEventListener('click', () => {
        if ("geolocation" in navigator) {
            const statusBox = document.getElementById('delivery-status');
            statusBox.className = 'delivery-status-box';
            statusBox.innerText = 'Buscando sinal do GPS...';
            statusBox.style.display = 'block';

            navigator.geolocation.getCurrentPosition(pos => {
                window._mapboxMap.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 17, essential: true });
            }, err => {
                statusBox.className = 'delivery-status-box status-error';
                statusBox.innerText = 'Permissão de GPS negada.';
            }, { enableHighAccuracy: true });
        }
    });
    geocoderContainer.appendChild(btnCurrentLocation);

    geocoder.on('result', (e) => window._mapboxMap.flyTo({ center: e.result.center, zoom: 17 }));

    window._mapboxMap.on('moveend', () => {
        clearTimeout(moveTimeout);
        moveTimeout = setTimeout(() => {
            const center = window._mapboxMap.getCenter();
            atualizarEnderecoViaCoordenadas(center.lng, center.lat);
        }, 400); // Aguarda um pouquinho mais para não bugar a API ao arrastar rápido
    });
}

function atualizarEnderecoViaCoordenadas(lng, lat) {
    document.getElementById('modal_lng').value = lng;
    document.getElementById('modal_lat').value = lat;
    
    console.log(`\n==========================================`);
    console.log(`📍 INICIANDO BUSCA POR COORDENADAS`);
    console.log(`👉 Longitude: ${lng} | Latitude: ${lat}`);
    
    const statusBox = document.getElementById('delivery-status');
    statusBox.className = 'delivery-status-box';
    statusBox.innerHTML = 'Buscando endereço pelo mapa...';
    statusBox.style.display = 'block';
    document.getElementById('btn-save-address').disabled = true;

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&language=pt-BR`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log("🗺️ MAPBOX RETORNOU (Resposta Bruta):", data);

            if (data.features && data.features.length > 0) {
                let rua = "", bairro = "", cidade = "", estado = "", cep = "", numeroExtraido = "";

                // A nova lógica lê todas as features retornadas do ponto mais específico para o mais amplo
                data.features.forEach(feature => {
                    // O id costuma vir no formato "tipo.id", ex: "address.12345"
                    const tipo = feature.id.split('.')[0];

                    if (tipo === 'address' && !rua) {
                        rua = feature.text;
                        if(feature.address) numeroExtraido = feature.address; 
                    } 
                    else if ((tipo === 'neighborhood' || tipo === 'locality') && !bairro) {
                        bairro = feature.text;
                    } 
                    else if (tipo === 'place' && !cidade) {
                        cidade = feature.text;
                    } 
                    else if (tipo === 'region' && !estado) {
                        // Trata o estado para pegar a sigla (ex: BR-MA -> MA)
                        estado = feature.properties && feature.properties.short_code 
                                 ? feature.properties.short_code.split('-')[1] || feature.text 
                                 : feature.text;
                    } 
                    else if (tipo === 'postcode' && !cep) {
                        cep = feature.text;
                    }
                });
                
                // Se ainda faltar algo, tenta extrair do "context" do primeiro resultado (plano B)
                const principal = data.features[0];
                if (principal && principal.context) {
                    principal.context.forEach(c => {
                        const cTipo = c.id.split('.')[0];
                        if ((cTipo === 'neighborhood' || cTipo === 'locality') && !bairro) bairro = c.text;
                        if (cTipo === 'place' && !cidade) cidade = c.text;
                        if (cTipo === 'postcode' && !cep) cep = c.text;
                        if (cTipo === 'region' && !estado && c.short_code) estado = c.short_code.split('-')[1];
                    });
                }

                console.log("🏠 DADOS EXTRAÍDOS DO MAPBOX:");
                console.log(`- Rua: ${rua}`);
                console.log(`- Número: ${numeroExtraido}`);
                console.log(`- Bairro: ${bairro}`);
                console.log(`- Cidade: ${cidade}`);
                console.log(`- Estado: ${estado}`);
                console.log(`- CEP: ${cep}`);
                console.log(`==========================================\n`);

                // Atualizando os inputs visuais
                document.getElementById('modal_logradouro').value = rua || "Rua não identificada pelo mapa";
                
                // CORREÇÃO: Agora ele sempre substitui o número se o Mapbox encontrar um!
                if(numeroExtraido) {
                    document.getElementById('modal_numero').value = numeroExtraido;
                }
                
                if(cep) document.getElementById('modal_cep').value = cep;
                
                const inputModalEstado = document.getElementById('modal_estado');
                if (inputModalEstado && estado) inputModalEstado.value = estado.toUpperCase();
                
                const inputModalCidade = document.getElementById('modal_cidade');
                if (inputModalCidade) {
                    inputModalCidade.value = cidade;
                    if (cidade && cidade.trim() !== "") {
                        inputModalCidade.setAttribute('readonly', true);
                        inputModalCidade.style.backgroundColor = '#f5f5f5';
                    } else {
                        inputModalCidade.removeAttribute('readonly');
                        inputModalCidade.style.backgroundColor = '#fff';
                    }
                }
                
                const inputModalBairro = document.getElementById('modal_bairro');
                if (inputModalBairro) {
                    inputModalBairro.value = bairro;
                    if (bairro && bairro.trim() !== "") {
                        validarBairroLogistica(bairro);
                    } else {
                        statusBox.className = 'delivery-status-box status-error';
                        statusBox.innerHTML = '⚠️ Não achamos o nome do seu bairro no mapa. Por favor, <b>digite-o manualmente abaixo</b>.';
                        document.getElementById('btn-save-address').disabled = true;
                    }
                }
            } else {
                statusBox.className = 'delivery-status-box status-error';
                statusBox.innerText = 'Não conseguimos identificar nada nesta área.';
                console.warn("⚠️ Nenhuma feature retornada pelo Mapbox para estas coordenadas.");
            }
        }).catch(err => {
            statusBox.className = 'delivery-status-box status-error';
            statusBox.innerText = 'Erro de conexão ao buscar endereço.';
            console.error("❌ ERRO NO FETCH DO MAPBOX:", err);
        });
}

function validarBairroLogistica(nomeBairroMapbox) {
    const statusBox = document.getElementById('delivery-status');
    const BAIRROS_LOGISTICA = JSON.parse(document.getElementById('bairros-logistica-data').textContent);
    
    if (!nomeBairroMapbox || nomeBairroMapbox.trim() === '') {
        statusBox.className = 'delivery-status-box status-error';
        statusBox.innerHTML = '⚠️ Digite o nome do bairro.';
        document.getElementById('btn-save-address').disabled = true;
        return;
    }

    const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const bairroBuscado = normalize(nomeBairroMapbox);
    const bairroEncontrado = BAIRROS_LOGISTICA.find(b => normalize(b.nome).includes(bairroBuscado) || bairroBuscado.includes(normalize(b.nome)));

    if (bairroEncontrado) {
        statusBox.className = 'delivery-status-box status-success';
        statusBox.innerText = `✅ Entregamos no ${bairroEncontrado.nome} (Taxa: R$ ${bairroEncontrado.taxa.toFixed(2).replace('.', ',')})`;
        document.getElementById('modal_bairro_id').value = bairroEncontrado.id;
        document.getElementById('checkout_bairro_id').value = bairroEncontrado.id; 
        document.getElementById('btn-save-address').disabled = false;
        console.log(`✅ Bairro logístico VÁLIDO: ${bairroEncontrado.nome} (ID: ${bairroEncontrado.id})`);
    } else {
        statusBox.className = 'delivery-status-box status-error';
        statusBox.innerHTML = `❌ Desculpe, não entregamos em <b>${nomeBairroMapbox}</b>.`;
        document.getElementById('btn-save-address').disabled = true;
        console.warn(`❌ Bairro logístico NÃO ATENDIDO: ${nomeBairroMapbox}`);
    }
}

// Inicializações e Eventos Principais
document.addEventListener("DOMContentLoaded", function() {
    
    // 1. MÁSCARA AUTOMÁTICA DO CEP
    const inputCep = document.getElementById('modal_cep');
    if (inputCep) {
        inputCep.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 5) value = value.replace(/^(\d{5})(\d)/, '$1-$2');
            e.target.value = value;
        });
    }

    // 2. INTEGRAÇÃO COM VIACEP PARA BUSCAR ENDEREÇO
    const btnBuscarCep = document.getElementById('btn-buscar-cep');
    if (btnBuscarCep) {
        btnBuscarCep.addEventListener('click', function() {
            let cep = document.getElementById('modal_cep').value.replace(/\D/g, '');
            if (cep.length !== 8) {
                alert("Por favor, informe um CEP válido."); return;
            }
            
            const statusBox = document.getElementById('delivery-status');
            statusBox.className = 'delivery-status-box';
            statusBox.innerHTML = 'Buscando CEP...';
            statusBox.style.display = 'block';

            fetch(`https://viacep.com.br/ws/${cep}/json/`)
            .then(res => res.json())
            .then(data => {
                if(data.erro) {
                    statusBox.className = 'delivery-status-box status-error';
                    statusBox.innerHTML = 'CEP não encontrado.';
                    return;
                }
                
                document.getElementById('modal_logradouro').value = data.logradouro;
                document.getElementById('modal_bairro').value = data.bairro;
                document.getElementById('modal_cidade').value = data.localidade;
                document.getElementById('modal_estado').value = data.uf;
                
                // Valida o bairro que a API do ViaCEP trouxe
                validarBairroLogistica(data.bairro);
                
                // Super Poder: Pega esse endereço que o ViaCEP achou e joga no Mapbox para mover o pino pra lá!
                const enderecoCompleto = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}, Brasil`;
                const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(enderecoCompleto)}.json?access_token=${mapboxgl.accessToken}&country=br`;
                
                fetch(mapboxUrl)
                .then(r => r.json())
                .then(geoData => {
                    if(geoData.features && geoData.features.length > 0) {
                        const coords = geoData.features[0].center;
                        if (window._mapboxMap) {
                            window._mapboxMap.flyTo({ center: coords, zoom: 17 });
                        }
                        document.getElementById('modal_lng').value = coords[0];
                        document.getElementById('modal_lat').value = coords[1];
                        console.log("📍 Coordenadas ajustadas via CEP:", coords);
                    }
                });
                
            }).catch(() => {
                statusBox.className = 'delivery-status-box status-error';
                statusBox.innerHTML = 'Erro de conexão ao buscar o CEP.';
            });
        });
    }

    // 3. VALIDAÇÃO AO DIGITAR O BAIRRO MANUALMENTE
    const inputModalBairro = document.getElementById('modal_bairro');
    if (inputModalBairro) {
        inputModalBairro.addEventListener('input', function(e) {
            if (!this.readOnly) validarBairroLogistica(e.target.value);
        });
    }

    // 4. ENVIO DOS DADOS PARA O BACKEND
    const registerForm = document.getElementById('full-register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const btnSaveAddress = document.getElementById('btn-save-address');
            
            if (!document.getElementById('modal_bairro_id').value) {
                alert("O bairro selecionado não é atendido pela loja."); return;
            }

            const formData = new FormData(registerForm);
            
            console.log("💾 SALVANDO DADOS DO FORMULÁRIO:");
            console.log("-> Latitude:", formData.get('latitude'));
            console.log("-> Longitude:", formData.get('longitude'));
            
            btnSaveAddress.disabled = true;
            btnSaveAddress.innerText = "Salvando...";

            fetch(CHECKOUT_CONFIG.urls.apiSalvarDados, { 
                method: 'POST', body: formData,
                headers: { 'X-CSRFToken': formData.get('csrfmiddlewaretoken') }
            })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    window.dadosCompletos = true;
                    console.log("✅ Endereço salvo com sucesso no banco de dados!");
                    document.dispatchEvent(new CustomEvent('enderecoSalvo', { 
                        detail: {
                            logradouro: document.getElementById('modal_logradouro').value,
                            numero: document.getElementById('modal_numero').value,
                            bairro: document.getElementById('modal_bairro').value,
                            cidade: document.getElementById('modal_cidade').value
                        }
                    }));
                    window.closeMapboxModal();
                } else {
                    console.error("❌ ERRO DO BACKEND AO SALVAR:", data.errors);
                    alert('Erro ao salvar: ' + JSON.stringify(data.errors));
                }
            })
            .catch(err => {
                console.error("❌ ERRO NA REQUISIÇÃO DE SALVAR:", err);
                alert('Erro de conexão.');
            })
            .finally(() => {
                btnSaveAddress.disabled = false;
                btnSaveAddress.innerText = "Confirmar Endereço";
            });
        });
    }
});