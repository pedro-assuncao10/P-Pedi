document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Pega a URL da API do elemento oculto no HTML
    const apiUrlInput = document.getElementById('dashboard-api-url');
    if (!apiUrlInput) {
        console.error("URL da API do dashboard não encontrada.");
        return;
    }
    const apiUrl = apiUrlInput.value;

    // Configuração Comum
    Chart.defaults.font.family = "'Poppins', sans-serif";
    Chart.defaults.color = '#666';

    // 2. Busca os dados no servidor
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) throw new Error("Erro na rede");
            return response.json();
        })
        .then(data => {
            console.log("Dados do Dashboard recebidos:", data);
            inicializarGraficos(data);
        })
        .catch(error => console.error("Erro ao carregar gráficos:", error));

    // 3. Função para desenhar os gráficos com os dados recebidos
    function inicializarGraficos(DASH_DATA) {
        
        // === 1. GRÁFICO DE LINHA (Vendas Semanais) ===
        const ctxLine = document.getElementById('salesLineChart');
        if (ctxLine) {
            new Chart(ctxLine.getContext('2d'), {
                type: 'line',
                data: {
                    labels: DASH_DATA.diasLabels,
                    datasets: [{
                        label: 'Pedidos',
                        data: DASH_DATA.diasData,
                        borderColor: '#e91e63',
                        backgroundColor: 'rgba(233, 30, 99, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#e91e63',
                        pointRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { borderDash: [5, 5] }, ticks: { stepSize: 1 } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // === 2. GRÁFICO DE BARRAS (Comparativo Mensal) ===
        const ctxBar = document.getElementById('monthlyBarChart');
        if (ctxBar) {
            new Chart(ctxBar.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: [DASH_DATA.mesPassadoNome, DASH_DATA.mesAtualNome],
                    datasets: [{
                        label: 'Total de Pedidos',
                        data: [DASH_DATA.mesPassado, DASH_DATA.mesAtual],
                        backgroundColor: ['#bdc3c7', '#0be881'],
                        borderRadius: 5,
                        barThickness: 50
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                }
            });
        }

        // === 3. GRÁFICO DE PIZZA (Categorias) ===
        const ctxPie = document.getElementById('categoryPieChart');
        if (ctxPie) {
            const temDados = DASH_DATA.catData && DASH_DATA.catData.length > 0 && DASH_DATA.catData.some(val => val > 0);
            const pieData = temDados ? DASH_DATA.catData : [1]; 
            const pieLabels = temDados ? DASH_DATA.catLabels : ['Sem dados ainda'];
            const pieColors = temDados 
                ? ['#e91e63', '#4b7bec', '#fca130', '#0be881', '#a55eea', '#2bcbba', '#eb3b5a'] 
                : ['#e0e0e0'];

            new Chart(ctxPie.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: pieLabels,
                    datasets: [{
                        data: pieData,
                        backgroundColor: pieColors,
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
                        tooltip: { enabled: temDados }
                    },
                    layout: { padding: 10 }
                }
            });
        }
    }
});