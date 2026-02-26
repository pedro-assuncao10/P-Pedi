document.addEventListener('DOMContentLoaded', function() {
    const body = document.body;
    const toggleBtn = document.getElementById('sidebarToggle');
    
    // Verifica tamanho da tela
    const isMobile = () => window.innerWidth <= 768;

    // Inicialização:
    // Se for mobile, garante que começa fechado (sem classe mobile-open)
    // Se for desktop, começa aberto (sem classe sidebar-closed)
    if (isMobile()) {
        body.classList.remove('sidebar-closed'); // No mobile a lógica é diferente
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Evita cliques duplos indesejados

            if (isMobile()) {
                // Mobile: Toggle de classe para abrir por cima
                body.classList.toggle('mobile-open');
            } else {
                // Desktop: Toggle de classe para empurrar layout
                body.classList.toggle('sidebar-closed');
            }
        });
    }

    // Fechar ao clicar fora no mobile
    document.addEventListener('click', function(e) {
        if (isMobile() && body.classList.contains('mobile-open')) {
            const sidebar = document.querySelector('.admin-sidebar');
            // Se o clique NÃO foi na sidebar nem no botão
            if (sidebar && !sidebar.contains(e.target) && e.target !== toggleBtn && !toggleBtn.contains(e.target)) {
                body.classList.remove('mobile-open');
            }
        }
    });

    // Ajuste ao redimensionar tela
    window.addEventListener('resize', function() {
        if (!isMobile()) {
            body.classList.remove('mobile-open');
        }
    });
});