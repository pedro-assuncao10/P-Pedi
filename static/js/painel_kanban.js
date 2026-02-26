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
    console.log("Kanban JS Visual Polido Carregado.");

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

    // --- 2. Sortable ---
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

                        if (isDragSelected && otherSelectedCards.length > 0) {
                            const idsParaMover = [draggedId];
                            otherSelectedCards.forEach(card => {
                                evt.to.appendChild(card);
                                idsParaMover.push(card.getAttribute('data-id'));
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

    // --- O CÓDIGO DO MODAL ANTIGO FOI REMOVIDO DAQUI ---
});