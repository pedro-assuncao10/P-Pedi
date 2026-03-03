// static/js/painel_kanban.js

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

document.addEventListener('DOMContentLoaded', function () {
    console.log("Kanban JS Visual Polido Carregado (Com Logística Ativada).");

    if (typeof KANBAN_CONFIG === 'undefined') return;

    // Configuração de API
    KANBAN_CONFIG.urlApiAtualizarLote = "/pedidos/api/kanban/atualizar-lote/";

    initMultiSelection();
    initSortable();
    initRealTimeMonitoring();
    initClearButton(); 

    // --- 1. Lógica de Multi-Seleção ---
    function initMultiSelection() {
        injectCheckboxes();

        // Header Checkbox
        document.querySelectorAll('.select-all-checkbox').forEach(headerCheckbox => {
            headerCheckbox.addEventListener('change', function() {
                const column = this.closest('.kanban-column');
                const isChecked = this.checked;
                const cards = column.querySelectorAll('.kanban-card');
                
                cards.forEach(card => {
                    const cardCheckbox = card.querySelector('.card-checkbox');
                    if (cardCheckbox) {
                        cardCheckbox.checked = isChecked;
                        toggleCardSelection(card, isChecked);
                    }
                });
            });
        });

        // Card Checkbox
        document.body.addEventListener('change', function(e) {
            if (e.target.classList.contains('card-checkbox')) {
                const card = e.target.closest('.kanban-card');
                toggleCardSelection(card, e.target.checked);
                updateHeaderCheckbox(card.closest('.kanban-column'));
            }
        });
    }

    function injectCheckboxes() {
        document.querySelectorAll('.kanban-card').forEach(card => {
            // Só adiciona se não existir
            if (!card.querySelector('.card-checkbox')) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'card-checkbox';
                checkbox.title = 'Selecionar';
                // Adiciona no início do card (mas o CSS position:absolute que manda na posição real)
                card.prepend(checkbox);
            }
        });
    }

    function toggleCardSelection(card, isSelected) {
        if (isSelected) card.classList.add('selected');
        else card.classList.remove('selected');
    }

    function updateHeaderCheckbox(column) {
        if (!column) return;
        const headerCheckbox = column.querySelector('.select-all-checkbox');
        const cards = column.querySelectorAll('.kanban-card');
        const checkedCards = column.querySelectorAll('.kanban-card .card-checkbox:checked');
        if (headerCheckbox) {
            headerCheckbox.checked = (cards.length > 0 && cards.length === checkedCards.length);
        }
    }

    // --- 2. Sortable (COM INTERCEPTADOR DE LOGÍSTICA) ---
    function initSortable() {
        const columns = document.querySelectorAll('.column-body');
        columns.forEach(column => {
            new Sortable(column, {
                group: 'kanban',
                animation: 150,
                ghostClass: 'sortable-ghost',
                delay: 0, 
                filter: '.card-checkbox', 
                
                onEnd: function (evt) {
                    if (evt.to !== evt.from) {
                        const draggedCard = evt.item;
                        const novoStatus = evt.to.closest('.kanban-column').getAttribute('data-status');
                        const draggedId = draggedCard.getAttribute('data-id');

                        const isDragSelected = draggedCard.classList.contains('selected');
                        const otherSelectedCards = Array.from(evt.from.querySelectorAll('.kanban-card.selected'));

                        // FLUXO PREPARADO PARA LOTE E DESPACHO MÚLTIPLO
                        let idsParaMover = [draggedId];
                        let cardsParaMover = [draggedCard];

                        if (isDragSelected && otherSelectedCards.length > 0) {
                            otherSelectedCards.forEach(card => {
                                if (card !== draggedCard) {
                                    idsParaMover.push(card.getAttribute('data-id'));
                                    cardsParaMover.push(card);
                                }
                            });
                        }

                        // FUNÇÃO DE EMERGÊNCIA: Se lojista fechar o modal, a carta volta pra coluna anterior
                        const reverterMovimento = () => {
                            const referenceNode = evt.from.children[evt.oldIndex] || null;
                            evt.from.insertBefore(draggedCard, referenceNode);
                        };

                        // FUNÇÃO NORMAL: Executa a troca de status padrão (Retiradas)
                        const executarMovimento = () => {
                            if (idsParaMover.length > 1) {
                                cardsParaMover.forEach(card => {
                                    evt.to.appendChild(card);
                                });
                                atualizarStatusLote(idsParaMover, novoStatus);
                                
                                Swal.fire({
                                    toast: true, position: 'bottom-end', icon: 'success', 
                                    title: `${idsParaMover.length} movidos!`, showConfirmButton: false, timer: 3000
                                });
                                limparSelecaoGlobal();
                            } else {
                                atualizarStatusServidor(draggedId, novoStatus);
                            }
                            
                            atualizarContadores();
                            updateHeaderCheckbox(evt.from.closest('.kanban-column'));
                            updateHeaderCheckbox(evt.to.closest('.kanban-column'));
                        };

                        // === O CÉREBRO: INTERCEPTAÇÃO PARA O MOTOBOY ===
                        if (novoStatus === 'PRONTO') {
                            // Pergunta ao backend os detalhes do pedido arrastado para saber se é entrega
                            fetch(`${KANBAN_CONFIG.urlApiDetalhes}${draggedId}/`)
                            .then(r => r.json())
                            .then(data => {
                                const endStr = (data.endereco_entrega || '').toLowerCase();
                                const isDelivery = endStr && endStr.trim() !== '' && !endStr.includes('retirada') && !endStr.includes('balcão');
                                
                                if (isDelivery) {
                                    // Se for delivery, abre a tela para escolher quem leva a Rota!
                                    abrirModalDespacho(idsParaMover, cardsParaMover, evt, reverterMovimento);
                                } else {
                                    executarMovimento(); // Se for retirada, segue a vida normal
                                }
                            })
                            .catch(err => {
                                console.error("Erro ao verificar detalhes:", err);
                                executarMovimento();
                            });
                        } else {
                            executarMovimento(); // Movimento normal para "Em Andamento"
                        }
                    }
                }
            });
        });
    }

    function atualizarStatusLote(ids, status) {
        fetch(KANBAN_CONFIG.urlApiAtualizarLote, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify({ pedido_ids: ids, novo_status: status })
        }).then(r=>r.json()).then(d=>{if(!d.success)console.error(d.error)});
    }

    function atualizarStatusServidor(id, status) {
        fetch(`${KANBAN_CONFIG.urlApiAtualizarStatus}${id}/`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify({ novo_status: status }) 
        }).then(r=>r.json()).then(d=>{if(!d.success)console.error(d.error)});
    }

    function limparSelecaoGlobal() {
        document.querySelectorAll('.kanban-card.selected').forEach(c => {
            c.classList.remove('selected');
            const cb = c.querySelector('.card-checkbox');
            if(cb) cb.checked = false;
        });
        document.querySelectorAll('.select-all-checkbox').forEach(cb => cb.checked = false);
    }

    function atualizarContadores() {
        document.querySelectorAll('.kanban-column').forEach(col => {
            const span = col.querySelector('.count');
            const cards = col.querySelectorAll('.column-body .kanban-card');
            if(span) span.innerText = cards.length;
        });
    }

    // --- 3. Monitoramento ---
    function initRealTimeMonitoring() {
        const POLLING_INTERVAL = 10000;
        const audioNotificacao = document.getElementById('audio-notificacao');
        
        if (audioNotificacao) {
            audioNotificacao.src = "https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3"; 
            audioNotificacao.volume = 1.0; 
        }
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        const unlock = () => {
            if(audioNotificacao) {
                audioNotificacao.muted=true; audioNotificacao.play().then(()=>{
                    audioNotificacao.pause(); audioNotificacao.currentTime=0; audioNotificacao.muted=false;
                }).catch(e=>{});
            }
            document.body.removeEventListener('click', unlock);
        };
        document.body.addEventListener('click', unlock);

        let ultimoId = getMaiorIdNaTela();

        setInterval(async () => {
            try {
                const res = await fetch(window.location.href);
                const text = await res.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                
                const novaCol = doc.getElementById('col-pendentes');
                if(!novaCol) return;

                const cards = novaCol.querySelectorAll('.kanban-card');
                let maxId = 0;
                cards.forEach(c => {
                    const id = parseInt(c.getAttribute('data-id'));
                    if(id > maxId) maxId = id;
                });

                if(maxId > ultimoId) {
                    if("Notification" in window && Notification.permission === "granted") new Notification("Novo Pedido!", { body: `Pedido #${maxId}`, icon: '/static/img/icon-pedido.png' });
                    if(audioNotificacao) { try { audioNotificacao.currentTime=0; await audioNotificacao.play(); } catch(e){} }

                    const colAtual = document.getElementById('col-pendentes');
                    const countAtual = document.getElementById('count-pendentes');
                    if(colAtual) {
                        colAtual.innerHTML = novaCol.innerHTML;
                        injectCheckboxes(); 
                    }
                    if(countAtual) countAtual.innerText = doc.getElementById('count-pendentes').innerText;
                    ultimoId = maxId;
                    atualizarContadores();
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Novo Pedido #${maxId}!`, timer: 5000, showConfirmButton: false });
                }
            } catch(e) { console.error(e); }
        }, POLLING_INTERVAL);
    }

    function getMaiorIdNaTela() {
        const col = document.getElementById('col-pendentes');
        if(!col) return 0;
        let max = 0;
        col.querySelectorAll('.kanban-card').forEach(c => {
            const id = parseInt(c.getAttribute('data-id'));
            if(id > max) max = id;
        });
        return max;
    }

    // --- Limpar Prontos ---
    function initClearButton() {
        const btn = document.getElementById('btn-limpar-prontos');
        if(!btn) return;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            Swal.fire({
                title: 'Limpar?', text: "Arquivar pedidos prontos?", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33'
            }).then((r) => { if(r.isConfirmed) limparPedidosProntos(); });
        });
    }

    function limparPedidosProntos() {
        Swal.fire({title:'Limpando...', didOpen:()=>Swal.showLoading()});
        fetch(KANBAN_CONFIG.urlApiLimparProntos, { method: 'POST', headers: {'X-CSRFToken': getCookie('csrftoken')} })
        .then(r=>r.json()).then(d=>{
            if(d.success) {
                document.getElementById('col-prontos').innerHTML='';
                const h = document.querySelector('.header-pronto .count'); if(h) h.innerText='0';
                const hc = document.querySelector('.header-pronto .select-all-checkbox'); if(hc) hc.checked=false;
                Swal.fire('Sucesso', 'Limpo!', 'success');
            } else Swal.fire('Erro', d.error, 'error');
        });
    }

    // ==========================================
    // FUNÇÕES DO MODAL DE LOGÍSTICA E DESPACHO
    // ==========================================

    function abrirModalDespacho(idsParaMover, cardsParaMover, evt, onCancel) {
        const dispatchModal = document.getElementById('dispatch-modal');
        const motoboySelect = document.getElementById('motoboy-select');
        const btnCancelDispatch = document.getElementById('btn-cancel-dispatch');
        const btnConfirmDispatch = document.getElementById('btn-confirm-dispatch');
        const dispatchOrderIdSpan = document.getElementById('dispatch-order-id');

        if (!dispatchModal) return;

        // Formata os textos
        if (idsParaMover.length > 1) {
            dispatchOrderIdSpan.innerText = `${idsParaMover.length} pedidos selecionados`;
        } else {
            dispatchOrderIdSpan.innerText = `#${idsParaMover[0]}`;
        }

        motoboySelect.innerHTML = '<option value="">Buscando frotas...</option>';
        dispatchModal.style.display = 'flex';

        // Busca apenas os que o lojista "ligou" hoje!
        fetch(KANBAN_CONFIG.urlApiMotoboysAtivos)
        .then(r => r.json())
        .then(data => {
            if (data.success && data.motoboys && data.motoboys.length > 0) {
                motoboySelect.innerHTML = '<option value="" disabled selected>Quem fará a rota?</option>';
                data.motoboys.forEach(m => {
                    motoboySelect.innerHTML += `<option value="${m.id}">🏍️ ${m.nome}</option>`;
                });
            } else {
                motoboySelect.innerHTML = '<option value="">Nenhum motoboy ativo. Ative na aba de frota.</option>';
            }
        })
        .catch(e => {
            motoboySelect.innerHTML = '<option value="">Erro ao conectar</option>';
        });

        // Limpa os event listeners anteriores (clonando os botões) para não dar bugs no DOM
        const newCancelBtn = btnCancelDispatch.cloneNode(true);
        btnCancelDispatch.parentNode.replaceChild(newCancelBtn, btnCancelDispatch);
        
        const newConfirmBtn = btnConfirmDispatch.cloneNode(true);
        btnConfirmDispatch.parentNode.replaceChild(newConfirmBtn, btnConfirmDispatch);

        newCancelBtn.addEventListener('click', () => {
            dispatchModal.style.display = 'none';
            onCancel(); // Retorna a carta pra coluna "Em Andamento"
        });

        newConfirmBtn.addEventListener('click', () => {
            const motoboyId = motoboySelect.value;
            if (!motoboyId) {
                alert('Selecione um motoboy disponível primeiro!');
                return;
            }

            newConfirmBtn.disabled = true;
            newConfirmBtn.innerText = 'Gerando Rota...';

            // Cria um Despacho para CADA ID Movido
            const promises = idsParaMover.map(id => {
                return fetch(KANBAN_CONFIG.urlApiDespacharPedido, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                    body: JSON.stringify({ pedido_id: id, motoboy_id: motoboyId })
                }).then(r => r.json());
            });

            Promise.all(promises).then(results => {
                dispatchModal.style.display = 'none';
                
                // Mover oficialmente os cards que o Sortable não moveu sozinho
                if (idsParaMover.length > 1) {
                    cardsParaMover.forEach(card => {
                        evt.to.appendChild(card);
                    });
                    limparSelecaoGlobal();
                }
                
                // Adiciona a "Etiqueta" do Motoboy no Front-End sem precisar recarregar
                const nomeMotoboy = motoboySelect.options[motoboySelect.selectedIndex].text.replace('🏍️ ', '');
                cardsParaMover.forEach(card => adicionarEtiquetaMotoboy(card, nomeMotoboy));

                atualizarContadores();
                updateHeaderCheckbox(evt.from.closest('.kanban-column'));
                updateHeaderCheckbox(evt.to.closest('.kanban-column'));

                Swal.fire({
                    toast: true, position: 'bottom-end', icon: 'success', 
                    title: `Rota despachada para ${nomeMotoboy}!`, showConfirmButton: false, timer: 4000
                });

            }).catch(e => {
                console.error(e);
                alert('Erro ao confirmar a rota de despacho.');
                onCancel(); 
            }).finally(() => {
                newConfirmBtn.disabled = false;
                newConfirmBtn.innerText = 'Atribuir Rota';
            });
        });
    }

    function adicionarEtiquetaMotoboy(card, nomeMotoboy) {
        // Procura onde fica a hora, para colocar a tag do lado (que adicionamos no template)
        const timeBadge = card.querySelector('.time-badge');
        if (timeBadge) {
            const timeContainer = timeBadge.parentElement;
            
            // Só adiciona se já não tiver sido adicionada
            if (!timeContainer.querySelector('.motoboy-badge')) {
                const badge = document.createElement('span');
                badge.className = 'motoboy-badge';
                badge.style.cssText = 'background-color: #e3f2fd; color: #1976d2; font-size: 0.75rem; padding: 3px 8px; border-radius: 6px; font-weight: 600; display: flex; align-items: center; gap: 4px;';
                badge.title = 'Atribuído ao Motoboy';
                badge.innerHTML = `<i class='bx bx-cycling'></i> ${nomeMotoboy}`;
                
                timeBadge.insertAdjacentElement('afterend', badge);
            }
        }
    }

});