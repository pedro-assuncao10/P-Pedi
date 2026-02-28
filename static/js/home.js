document.addEventListener('DOMContentLoaded', function() {
    // --- Lógica do menu de perfil ---
    const profileButton = document.getElementById('profile-menu-button');
    const profileMenu = document.getElementById('profile-dropdown-menu');
    if (profileButton && profileMenu) {
        profileButton.addEventListener('click', (event) => {
            event.preventDefault();
            profileMenu.classList.toggle('is-open');
        });
        document.addEventListener('click', (event) => {
            if (!profileMenu.contains(event.target) && !profileButton.contains(event.target)) {
                profileMenu.classList.remove('is-open');
            }
        });
    }

    // --- LÓGICA DOS MODAIS ---
    const modalOverlay = document.getElementById('modal-overlay');
    const allModals = document.querySelectorAll('.modal');
    const allModalTriggers = document.querySelectorAll('[data-modal-target]');

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal && modalOverlay) {
            modalOverlay.classList.add('is-visible');
            modal.classList.add('is-visible');
            if (profileMenu) profileMenu.classList.remove('is-open');
        }
    }

    function closeModal() {
        if (modalOverlay) {
            modalOverlay.classList.remove('is-visible');
            allModals.forEach(modal => modal.classList.remove('is-visible'));
        }
    }

    allModalTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            openModal(trigger.dataset.modalTarget);
        });
    });

    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
    
    // Fecha modal com X ou com botões de ação (como "Entendi")
    document.querySelectorAll('.modal-close-btn, .modal-close-btn-action').forEach(btn => btn.addEventListener('click', closeModal));


    // --- LÓGICA DOS FORMULÁRIOS NOS MODAIS (AJAX) ---
    const editProfileForm = document.getElementById('edit-profile-form');
    const changePasswordForm = document.getElementById('change-password-form');

    async function submitProfileForm(form, url) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        form.querySelectorAll('.form-error').forEach(el => {
            el.textContent = ''; el.style.display = 'none';
        });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (result.success) {
                closeModal();
                alert(result.message || 'Operação realizada com sucesso!');
                if (result.reload) window.location.reload();
            } else if (result.errors) {
                for (const field in result.errors) {
                    const errorDiv = form.querySelector(`[name="${field}"]`)?.closest('.form-group').querySelector('.form-error');
                    if (errorDiv) {
                        errorDiv.textContent = result.errors[field][0];
                        errorDiv.style.display = 'block';
                    }
                }
            } else {
                alert(result.message || 'Ocorreu um erro.');
            }
        } catch (error) {
            console.error('Erro ao submeter o formulário:', error);
            alert('Ocorreu um erro de conexão.');
        }
    }

    if (editProfileForm) {
        editProfileForm.addEventListener('submit', function(event) {
            event.preventDefault();
            submitProfileForm(this, '/conta/api/editar-dados/');
        });
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', function(event) {
            event.preventDefault();
            submitProfileForm(this, '/conta/api/alterar-senha/');
        });
    }

    // --- LÓGICA DO NOVO MODAL DE INFORMAÇÕES DA LOJA (NOVO) ---
    const storeInfoModal = document.getElementById('store-info-modal');
    if (storeInfoModal) {
        const tabLinks = storeInfoModal.querySelectorAll('.tab-link');
        const tabContents = storeInfoModal.querySelectorAll('.tab-content');

        tabLinks.forEach(link => {
            link.addEventListener('click', () => {
                const tabId = link.dataset.tab;

                // Remove a classe 'active' de todos
                tabLinks.forEach(l => l.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                // Adiciona a classe 'active' ao clicado e ao conteúdo correspondente
                link.classList.add('active');
                document.getElementById(`tab-${tabId}`).classList.add('active');
            });
        });
    }

    // --- LÓGICA DO CARDÁPIO E SACOLA ---
    const categoryMenu = document.getElementById('category-menu');
    const searchInput = document.querySelector('.search-bar input'); // NOVO: Campo de busca
    const productContainer = document.getElementById('product-sections-container');
    const cartContent = document.getElementById('cart-content');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartTotal = document.getElementById('cart-total');
    const checkoutButton = document.getElementById('checkout-button');
    const clearCartButton = document.getElementById('cart-clear-btn');
    const productModal = document.getElementById('product-detail-modal');
    const productModalBody = document.getElementById('product-modal-body');
    
    
    const categoriesApiUrl = '/api/categorias/';
    const productsApiUrl = '/api/produtos/';
    const cartApiUrl = '/carrinho/api/';
    const cartAddApiUrl = '/carrinho/api/add/';
    const cartRemoveApiUrl = '/carrinho/api/remove/';
    const cartUpdateApiUrl = '/carrinho/api/update/';
    const cartClearApiUrl = '/carrinho/api/clear/';

    const formatCurrency = (value) => `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;

    function updateCartUI(cartData) {
        // === CORREÇÃO: Verificação de segurança ===
        if (!cartContent) return; 

        if (!cartData || cartData.items.length === 0) {
            cartContent.innerHTML = `<div class="empty-cart"><div class="lock-icon"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div><p>Sacola vazia</p></div>`;
            if(cartSubtotal) cartSubtotal.textContent = formatCurrency(0);
            if(cartTotal) cartTotal.textContent = formatCurrency(0);
            
            if(checkoutButton) {
                checkoutButton.textContent = 'Sacola vazia';
                checkoutButton.disabled = true;
            }
            if (clearCartButton) clearCartButton.style.display = 'none';
        } else {
            let itemsHTML = '<div class="cart-items-list">';
            cartData.items.forEach(item => {
                const imageUrl = item.product.imagens && item.product.imagens.length > 0 ? item.product.imagens[0].imagem : `/static/imagem/pizza.jpg`;
                itemsHTML += `
                    <div class="cart-item" data-item-id="${item.id}" data-quantity="${item.quantity}">
                        <img src="${imageUrl}" alt="${item.product.nome}" class="cart-item-image">
                        <div class="cart-item-details">
                            <span class="cart-item-name">${item.quantity}x ${item.product.nome}</span>
                            ${item.observation ? `<span class="cart-item-observation">Obs: ${item.observation}</span>` : ''}
                            <div class="cart-item-actions">
                                <button class="cart-item-edit">Editar</button>
                                <button class="cart-item-remove">Remover</button>
                            </div>
                        </div>
                        <span class="cart-item-price">${formatCurrency(item.total_price)}</span>
                    </div>`;
            });
            itemsHTML += '</div>';
            
            cartContent.innerHTML = itemsHTML;
            
            if(cartSubtotal) cartSubtotal.textContent = formatCurrency(cartData.total_price);
            if(cartTotal) cartTotal.textContent = formatCurrency(cartData.total_price);
            
            if(checkoutButton) {
                checkoutButton.textContent = 'Continuar pedido';
                checkoutButton.disabled = false;
            }
            if (clearCartButton) clearCartButton.style.display = 'block';
        }
    }

    async function makeCartRequest(url, method = 'POST', body = null) {
        try {
            const config = { method, headers: { 'X-CSRFToken': getCookie('csrftoken'), 'Content-Type': 'application/json' }};
            if (body) config.body = JSON.stringify(body);
            const response = await fetch(url, config);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const cartData = await response.json();
            updateCartUI(cartData);
        } catch (error) {
            console.error(`Erro ao interagir com a sacola (${url}):`, error);
        }
    }

    const addToCart = (productId, quantity = 1, observation = '') => makeCartRequest(`${cartAddApiUrl}${productId}/`, 'POST', { quantity, observation });
    const removeFromCart = (itemId) => makeCartRequest(`${cartRemoveApiUrl}${itemId}/`);
    const updateCartItemQuantity = (itemId, quantity, observation) => makeCartRequest(`${cartUpdateApiUrl}${itemId}/`, 'POST', { quantity, observation });
    const clearCart = () => makeCartRequest(cartClearApiUrl);

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
    
    function createProductCardHTML(product) {
        const imageUrl = product.imagens && product.imagens.length > 0 ? product.imagens[0].imagem : `/static/imagem/pizza.jpg`;
        const price = parseFloat(product.preco).toFixed(2).replace('.', ',');
        return `<article class="product-card" data-product-id="${product.id}"><div class="product-info"><h3>${product.nome}</h3><p class="product-description">${product.descricao}</p><div class="product-price">R$ ${price}</div></div><div class="product-image"><img src="${imageUrl}" alt="${product.nome}"></div></article>`;
    }

    // ATUALIZADO: Função que carrega e renderiza os dados
    async function loadMenu(searchTerm = '') {
        if (!categoryMenu || !productContainer) return;

        let currentProductsApiUrl = productsApiUrl;
        if (searchTerm && searchTerm.trim() !== '') {
            currentProductsApiUrl = `${productsApiUrl}?search=${encodeURIComponent(searchTerm)}`;
        }

        try {
            const [categoriesResponse, productsResponse] = await Promise.all([
                fetch(categoriesApiUrl),
                fetch(currentProductsApiUrl)
            ]);

            if (!categoriesResponse.ok || !productsResponse.ok) {
                throw new Error('Falha ao carregar os dados do cardápio.');
            }

            const categories = await categoriesResponse.json();
            const products = await productsResponse.json();
            
            const productsByCategory = {};
            products.forEach(product => {
                if (product.categoria) {
                    const categoryId = product.categoria.id;
                    if (!productsByCategory[categoryId]) productsByCategory[categoryId] = [];
                    productsByCategory[categoryId].push(product);
                }
            });

            categoryMenu.innerHTML = '';
            productContainer.innerHTML = '';

            let hasProducts = products.length > 0;

            categories.forEach((category, index) => {
                const categoryProducts = productsByCategory[category.id] || [];
                
                if (categoryProducts.length > 0) {
                    const categoryLink = document.createElement('a');
                    categoryLink.href = `#category-${category.id}`;
                    categoryLink.className = 'category-link';
                    categoryLink.textContent = category.nome;
                    categoryMenu.appendChild(categoryLink);

                    const categorySection = document.createElement('div');
                    categorySection.className = 'product-category';
                    categorySection.id = `category-${category.id}`;
                    
                    const categoryTitle = document.createElement('h2');
                    categoryTitle.textContent = category.nome;
                    categorySection.appendChild(categoryTitle);

                    // --- NOVA LÓGICA DE LAYOUT (HORIZONTAL / VERTICAL) ---
                    // Cria uma div (wrapper) para segurar todos os produtos daquela categoria
                    const productsWrapper = document.createElement('div');
                    const layoutMode = (typeof HOME_CONFIG !== 'undefined' && HOME_CONFIG.layoutDirection) ? HOME_CONFIG.layoutDirection : 'vertical';
                    // Adiciona a classe 'layout-horizontal' ou 'layout-vertical'
                    productsWrapper.className = `products-wrapper layout-${layoutMode}`;

                    categoryProducts.forEach(product => {
                        productsWrapper.innerHTML += createProductCardHTML(product);
                    });
                    
                    // Coloca os produtos na sessão e depois no DOM
                    categorySection.appendChild(productsWrapper);
                    productContainer.appendChild(categorySection);
                }
            });
            
            if(categoryMenu.firstChild) {
                categoryMenu.firstChild.classList.add('active');
            }

            if (!hasProducts && searchTerm) {
                 productContainer.innerHTML = `<p class="empty-message">Nenhum produto encontrado para "<strong>${searchTerm}</strong>".</p>`;
            }

        } catch (error) {
            console.error('Erro:', error);
            productContainer.innerHTML = '<p class="error-message">Ocorreu um erro ao carregar o cardápio.</p>';
        }
    }

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    if (searchInput) {
        searchInput.addEventListener('input', debounce((event) => {
            loadMenu(event.target.value);
        }, 300));
    }

    async function openProductModal(productId) {
        try {
            const response = await fetch(`/api/produtos/${productId}/`);
            if (!response.ok) throw new Error('Produto não encontrado.');
            const product = await response.json();
            
            const imageUrl = product.imagens.length > 0 ? product.imagens[0].imagem : `/static/imagem/placeholder.jpg`;
            const price = parseFloat(product.preco);

            productModalBody.innerHTML = `
                <img src="${imageUrl}" alt="${product.nome}" class="product-modal-image">
                <h2 class="product-modal-title">${product.nome}</h2>
                <div class="product-modal-price" id="modal-price">${formatCurrency(price)}</div>
                <div class="form-group product-modal-observation">
                    <label for="observation">Alguma observação?</label>
                    <textarea id="observation" placeholder="Ex: tirar a cebola, ponto da carne, etc."></textarea>
                </div>
                <div class="product-modal-actions">
                    <div class="quantity-stepper">
                        <button id="decrease-quantity">-</button>
                        <input type="number" id="quantity-input" value="1" min="1">
                        <button id="increase-quantity">+</button>
                    </div>
                    <button class="btn primary" id="add-to-cart-btn" data-product-id="${product.id}" data-base-price="${price}">
                        <span>Adicionar</span>
                        <span id="modal-total-price">${formatCurrency(price)}</span>
                    </button>
                </div>
            `;
            
            openModal('product-detail-modal');
            setupModalEventListeners();
        } catch (error) {
            console.error("Erro ao abrir modal do produto:", error);
            alert("Não foi possível carregar os detalhes do produto.");
        }
    }

    function setupModalEventListeners() {
        const decreaseBtn = document.getElementById('decrease-quantity');
        const increaseBtn = document.getElementById('increase-quantity');
        const quantityInput = document.getElementById('quantity-input');
        const addToCartBtn = document.getElementById('add-to-cart-btn');
        const modalTotalPrice = document.getElementById('modal-total-price');
        
        if (!addToCartBtn) return; 
        
        const basePrice = parseFloat(addToCartBtn.dataset.basePrice);

        function updateModalPrice() {
            const quantity = parseInt(quantityInput.value) || 1;
            modalTotalPrice.textContent = formatCurrency(basePrice * quantity);
        }

        decreaseBtn.addEventListener('click', () => {
            let quantity = parseInt(quantityInput.value);
            if (quantity > 1) {
                quantityInput.value = quantity - 1;
                updateModalPrice();
            }
        });

        increaseBtn.addEventListener('click', () => {
            let quantity = parseInt(quantityInput.value);
            quantityInput.value = quantity + 1;
            updateModalPrice();
        });
        
        quantityInput.addEventListener('input', updateModalPrice);

        addToCartBtn.addEventListener('click', () => {
            const productId = addToCartBtn.dataset.productId;
            const quantity = parseInt(quantityInput.value);
            const observation = document.getElementById('observation').value;
            addToCart(productId, quantity, observation);
            closeModal();
        });
    }

    if (productContainer) {
        productContainer.addEventListener('click', (event) => {
            const productCard = event.target.closest('.product-card');
            if (productCard) {
                event.preventDefault();
                const productId = productCard.dataset.productId;
                if (productId) {
                    openProductModal(productId);
                }
            }
        });
    }

    if (cartContent) {
        cartContent.addEventListener('click', (event) => {
            const target = event.target;
            const itemElement = target.closest('.cart-item');
            if (!itemElement) return;

            const itemId = itemElement.dataset.itemId;
            
            if (target.classList.contains('cart-item-remove')) {
                removeFromCart(itemId);
            } else if (target.classList.contains('cart-item-edit')) {
                const currentQuantity = itemElement.dataset.quantity;
                const newQuantity = prompt('Nova quantidade:', currentQuantity);
                if (newQuantity !== null && !isNaN(newQuantity) && newQuantity >= 0) {
                    updateCartItemQuantity(itemId, parseInt(newQuantity));
                }
            }
        });
    }

    if(clearCartButton) {
        clearCartButton.addEventListener('click', clearCart);
    }

    if(checkoutButton) {
        checkoutButton.addEventListener('click', () => {
            if (typeof HOME_CONFIG !== 'undefined' && !HOME_CONFIG.isStoreOpen) {
                openModal('store-closed-modal');
                return; 
            }

            if (!checkoutButton.disabled && checkoutButton.textContent !== 'Sacola vazia') {
                if (typeof checkoutUrl !== 'undefined') {
                    window.location.href = checkoutUrl;
                } else {
                    console.error('checkoutUrl não está definida. Por favor, defina-a no seu template.');
                }
            }
        });
    }
    
    async function initializePage() {
        await loadMenu();
        try {
            const initialCartResponse = await fetch(cartApiUrl);
            const initialCartData = await initialCartResponse.json();
            updateCartUI(initialCartData);
        } catch(error) {
            console.error("Erro ao carregar sacola inicial:", error);
        }
    }

    initializePage();
});