document.addEventListener('DOMContentLoaded', function() {
    // ==========================================
    // 1. MAPEAMENTO DE ELEMENTOS DO DOM
    // ==========================================
    const carousel = document.getElementById("carousel-container");
    const searchInput = document.getElementById("pesquisar");
    const btnBaba = document.getElementById('baba');
    const btnResponsavel = document.getElementById('responsavel');
    const btnLeft = document.getElementById('left');
    const btnRight = document.getElementById('right');
    
    let listaOriginal = []; // Variável global para armazenar os dados da API

    // ==========================================
    // 2. CARREGAMENTO VIA API
    // ==========================================
    async function carregarDadosDaAPI() {
        try {
            // Ajuste aqui para a rota final da sua API
            const res = await fetch('/api/babas'); 
            
            if (!res.ok) throw new Error("Erro ao conectar com o servidor");
            
            listaOriginal = await res.json();
            renderizarBabas(listaOriginal);
        } catch (erro) {
            console.error("Erro no carregamento:", erro);
            if (carousel) {
                carousel.innerHTML = `
                    <div class="p-5 text-center w-100">
                        <p class="text-danger fw-bold">Erro ao carregar babás. Verifique se o servidor da API está rodando.</p>
                    </div>`;
            }
        }
    }

    // ==========================================
    // 3. RENDERIZAÇÃO DOS CARDS
    // ==========================================
    function renderizarBabas(lista) {
        if (!carousel) return;

        // Se o JSON estiver vazio ou a busca não retornar nada
        if (lista.length === 0) {
            carousel.innerHTML = "<p class='text-muted w-100 text-center p-4 fw-bold'>Nenhuma babá encontrada.</p>";
            return;
        }

        // Gera o HTML dos cards baseando-se no array que foi passado
        carousel.innerHTML = lista.map(baba => `
            <div class="card shadow-sm mx-2 d-inline-block" style="min-width: 280px; max-width: 280px; flex: 0 0 auto; border-radius: 15px;">
                <img src="${baba.foto_perfil_nome || '../../img/placeholder.png'}" 
                     class="card-img-top" 
                     alt="Foto de ${baba.nome}" 
                     style="height: 250px; object-fit: cover; border-radius: 15px 15px 0 0;">
                <div class="card-body text-start">
                    <h5 class="card-title fw-bold text-dark">${baba.nome}</h5>
                    
                    <p class="card-text text-muted mb-1 d-flex align-items-center">
                        <i class="material-icons fs-6 me-2 text-primary">phone</i> ${baba.telefone || 'Não informado'}
                    </p>
                    
                    <p class="card-text text-muted mb-3 d-flex align-items-center">
                        <i class="material-icons fs-6 me-2 text-primary">email</i> 
                        <span class="d-inline-block text-truncate" style="max-width: 200px;">${baba.email || 'Não informado'}</span>
                    </p>
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-success rounded-pill">${baba.status_cadastro || 'Ativa'}</span>
                        <button class="btn btn-outline-primary btn-sm fw-bold rounded-pill">Ver Perfil</button>
                    </div>
                </div>
            </div>
        `).join('');

        // Recalcula o carrossel toda vez que renderizamos cards novos
        iniciarLogicaCarrossel();
    }

    // ==========================================
    // 4. PESQUISA (FILTRO DINÂMICO)
    // ==========================================
    searchInput?.addEventListener('input', (e) => {
        const termoBusca = e.target.value.toLowerCase().trim(); 
        
        // Filtra a lista original baseada no que foi digitado
        const filtradas = listaOriginal.filter(baba => 
            baba.nome.toLowerCase().includes(termoBusca)
        );
        
        // Renderiza apenas os resultados da busca
        renderizarBabas(filtradas); 
    });

    // ==========================================
    // 5. NAVEGAÇÃO
    // ==========================================
    btnBaba?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = "../html_inclusao_babas/formulario/interface_inclusao_babas.html";
    });

    btnResponsavel?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = "../html_inclusao_respon/interface_inclusao_responsaveis.html";
    });

    // ==========================================
    // 6. MOTOR DO CARROSSEL
    // ==========================================
    function iniciarLogicaCarrossel() {
        const firstCard = carousel?.querySelector(".card");
        if (!firstCard) return;
        
        // Largura do card + a margem (mx-2)
        const cardWidth = firstCard.offsetWidth + 16; 

        if (btnLeft) {
            btnLeft.onclick = () => {
                carousel.scrollLeft -= cardWidth;
            };
        }

        if (btnRight) {
            btnRight.onclick = () => {
                carousel.scrollLeft += cardWidth;
            };
        }

        // Opcional: Ocultar as setas se chegar no fim/início
        carousel.onscroll = () => {
            let scrollWidth = carousel.scrollWidth - carousel.clientWidth;
            if (btnLeft) btnLeft.style.visibility = carousel.scrollLeft <= 5 ? "hidden" : "visible";
            if (btnRight) btnRight.style.visibility = carousel.scrollLeft >= scrollWidth - 5 ? "hidden" : "visible";
        };
    }

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================
    carregarDadosDaAPI();
});