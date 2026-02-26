console.log("Arquivo JS de Pedidos v5 carregado.");

document.addEventListener("DOMContentLoaded", function() {
    
    // 1. Elementos do Modal
    const modal = document.getElementById('order-details-modal');
    const closeBtn = document.getElementById('close-order-modal');

    // Elementos de conteúdo interno
    const elTitle = document.getElementById('modal-order-title');
    const elDate = document.getElementById('modal-order-date');
    const elStatus = document.getElementById('modal-order-status');
    const elAddress = document.getElementById('modal-order-address');
    const elPayment = document.getElementById('modal-order-payment');
    const elItemsList = document.getElementById('modal-order-items');
    const elTotal = document.getElementById('modal-order-total');
    
    // NOVOS Elementos: Cliente e Telefone
    const elCustomer = document.getElementById('modal-order-customer');
    const elPhoneRow = document.getElementById('modal-order-phone-row');
    const elPhone = document.getElementById('modal-order-phone');

    // Elementos de Agendamento
    const elScheduleRow = document.getElementById('modal-order-schedule-row');
    const elScheduleVal = document.getElementById('modal-order-schedule');

    // Elementos Extras de Pagamento
    const elCardBrandRow = document.getElementById('modal-payment-card-brand');
    const elCardBrandVal = document.getElementById('modal-card-brand-value');
    const elChangeRow = document.getElementById('modal-payment-change');
    const elChangeVal = document.getElementById('modal-change-value');
    const elChangeReturn = document.getElementById('modal-change-return'); // Novo (Cálculo de Troco)

    // 2. Funções de Controle do Modal
    function openModal() {
        if(modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Evita rolagem da página de fundo
        } else {
            console.error("ERRO: O Modal com id 'order-details-modal' não foi encontrado na página. Verifique se o {% include %} está presente.");
        }
    }

    function closeModal() {
        if(modal) {
            modal.classList.remove('active');
            document.body.style.overflow = ''; // Devolve a rolagem
        }
    }

    // 3. Event Listeners para Fechar
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // 4. Lógica de Clique nos Botões (Event Delegation)
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.js-open-order');
        
        if (btn) {
            const pedidoId = btn.getAttribute('data-id');
            console.log("Clicou no pedido:", pedidoId);
            fetchOrderDetails(pedidoId);
        }
    });

    // 5. Função que busca os dados na API
    function fetchOrderDetails(pedidoId) {
        if (!PEDIDOS_CONFIG || !PEDIDOS_CONFIG.urlApiDetalhesBase) {
            console.error("Configuração de URL não encontrada.");
            return;
        }

        // Reset visual antes de carregar
        openModal();
        if(elTitle) elTitle.innerText = `Carregando Pedido #${pedidoId}...`;
        if(elItemsList) elItemsList.innerHTML = '<li style="text-align:center; padding: 20px; color:#888;">Buscando informações...</li>';
        
        // Esconde campos extras preventivamente
        if(elCardBrandRow) elCardBrandRow.style.display = 'none';
        if(elChangeRow) elChangeRow.style.display = 'none';
        if(elPhoneRow) elPhoneRow.style.display = 'none';
        
        // Construção da URL
        const url = `${PEDIDOS_CONFIG.urlApiDetalhesBase}${pedidoId}/`;

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                return response.json();
            })
            .then(data => {
                console.log("Dados do pedido:", data);
                updateModalContent(data);
            })
            .catch(err => {
                console.error("Erro ao buscar pedido:", err);
                if(elItemsList) elItemsList.innerHTML = `<li style="color:red; text-align:center; padding: 20px;">Erro ao carregar detalhes. Tente novamente.</li>`;
                if(elTitle) elTitle.innerText = "Erro";
            });
    }

    // 6. Atualiza o DOM com os dados
    function updateModalContent(data) {
        // Título e ID
        if(elTitle) elTitle.innerText = `Pedido #${data.id}`;
        
        // Data
        if(elDate && data.criado_em) {
            const dateObj = new Date(data.criado_em);
            elDate.innerText = dateObj.toLocaleDateString('pt-BR') + ' às ' + dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        }

        // Status
        if(elStatus) elStatus.innerText = data.status_display || data.status;

        // Cliente e Telefone
        if(elCustomer) {
            // Tenta pegar o nome formatado ou exibe um fallback
            elCustomer.innerText = data.cliente_nome_completo || data.cliente || 'Cliente não identificado';
        }
        if(elPhoneRow && elPhone) {
            if(data.telefone) {
                elPhoneRow.style.display = 'block';
                elPhone.innerText = data.telefone;
            }
        }

        // Endereço
        if(elAddress) elAddress.innerText = data.endereco_entrega || 'Retirada na Loja (Balcão)';

        // Pagamento
        const paymentMap = { 'pix': 'PIX', 'credit': 'Cartão de Crédito', 'money': 'Dinheiro' };
        if(elPayment) elPayment.innerText = paymentMap[data.metodo_pagamento] || data.metodo_pagamento || '-';

        // === Bandeira do Cartão ===
        if (elCardBrandRow && elCardBrandVal) {
            if (data.bandeira_cartao && data.bandeira_cartao.trim() !== '') {
                elCardBrandRow.style.display = 'flex';
                elCardBrandVal.innerText = data.bandeira_cartao;
            } else {
                elCardBrandRow.style.display = 'none';
            }
        }

        // === Troco e Cálculo de Devolução ===
        const totalValue = parseFloat(data.valor_total || 0);
        
        if (elChangeRow && elChangeVal && elChangeReturn) {
            if (data.troco_para) {
                const trocoPara = parseFloat(data.troco_para);
                const valorDevolver = trocoPara - totalValue;

                elChangeRow.style.display = 'flex';
                elChangeVal.innerText = `R$ ${trocoPara.toFixed(2).replace('.', ',')}`;
                
                // Só exibe devolução se houver troco a ser dado
                if (valorDevolver > 0) {
                    elChangeReturn.innerText = `R$ ${valorDevolver.toFixed(2).replace('.', ',')}`;
                } else {
                    elChangeReturn.innerText = 'R$ 0,00';
                }
            } else {
                elChangeRow.style.display = 'none';
            }
        }

        // === Agendamento ===
        if (elScheduleRow && elScheduleVal) {
            if (data.data_agendamento) {
                elScheduleRow.style.display = 'block';
                const dateAgend = new Date(data.data_agendamento);
                elScheduleVal.innerText = dateAgend.toLocaleDateString('pt-BR') + ' às ' + dateAgend.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            } else {
                elScheduleRow.style.display = 'none';
            }
        }

        // === LISTA DE ITENS ESTILIZADA ===
        if(elItemsList) {
            elItemsList.innerHTML = '';
            const itens = data.itens || [];
            
            if (itens.length > 0) {
                itens.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'modal-item'; // Aplica a nova classe do CSS do Canvas
                    
                    // Obtém o nome do produto
                    let nome = "Produto";
                    if (item.produto_nome) nome = item.produto_nome;
                    else if (item.produto && item.produto.nome) nome = item.produto.nome;
                    else if (typeof item.produto === 'string') nome = item.produto;

                    const totalItem = (parseFloat(item.preco_unitario || 0) * (item.quantidade || 1));

                    // Lógica para injetar a observação se ela existir
                    let obsHTML = '';
                    if (item.observacao && item.observacao.trim() !== '') {
                        obsHTML = `<div class="modal-item-obs">Obs: ${item.observacao}</div>`;
                    }

                    // Constrói o HTML usando as classes modernas
                    li.innerHTML = `
                        <div class="modal-item-main">
                            <span class="modal-item-qty">${item.quantidade}x</span>
                            <span class="modal-item-name">${nome}</span>
                            <span class="modal-item-price">R$ ${totalItem.toFixed(2).replace('.', ',')}</span>
                        </div>
                        ${obsHTML}
                    `;
                    elItemsList.appendChild(li);
                });
            } else {
                elItemsList.innerHTML = '<li style="text-align:center; padding: 20px;">Nenhum item encontrado.</li>';
            }
        }

        // === Total ===
        if(elTotal) {
            elTotal.innerText = `R$ ${totalValue.toFixed(2).replace('.', ',')}`;
        }
    }
});