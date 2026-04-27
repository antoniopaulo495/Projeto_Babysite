/*document.addEventListener('DOMContentLoaded', function() {
    // 1. MAPEAMENTO DE ELEMENTOS DO DOM
    const carousel = document.getElementById("carousel-container");
    const searchInput = document.getElementById("pesquisar");
    const btnBaba = document.getElementById('baba');
    const btnResponsavel = document.getElementById('responsavel');
    
    let listaOriginal = []; 

    // ==========================================
    // 2. CARREGAMENTO VIA API
    // ==========================================
    async function carregarDadosDaAPI() {
        try {
            const res = await fetch('/api/babas'); 
            if (!res.ok) throw new Error("Erro ao conectar com o servidor");
            
            listaOriginal = await res.json();
            renderizarBabas(listaOriginal);
        } catch (erro) {
            console.error("Erro no carregamento:", erro);
            if (carousel) {
                carousel.innerHTML = `
                    <div class="p-5 text-center w-100">
                        <p class="text-danger">Erro ao carregar babás. Verifique se o servidor Node está rodando.</p>
                    </div>`;
            }
        }
    }

    // ==========================================
    // 3. RENDERIZAÇÃO DOS CARDS
    // ==========================================
    function renderizarBabas(lista) {
        if (!carousel) return;

        if (lista.length === 0) {
            carousel.innerHTML = "<p class='p-4 fw-bold'>Nenhuma babá encontrada para essa busca.</p>";
            return;
        }

        carousel.innerHTML = lista.map(baba => `
            <article class="card border-0 shadow-sm" style="min-width: 280px; border-radius: 15px;">
                <figure class="m-0">
                    <img src="${baba.foto || 'img/placeholder.png'}" 
                         alt="Foto de ${baba.nome}" 
                         class="card-img-top" 
                         style="height: 240px; object-fit: cover; border-radius: 15px 15px 0 0;">
                    <figcaption class="card-body p-3">
                        <h3 class="h5 fw-bold mb-1">${baba.nome}</h3>
                        <div class="d-flex align-items-center gap-2 text-muted small">
                            <span class="d-flex align-items-center text-dark fw-bold">
                                <i class="material-icons text-warning" style="font-size: 18px;">star</i> 4.9
                            </span>
                            <i class="material-icons" style="font-size: 6px;">circle</i>
                            <span>Verificada</span>
                        </div>
                    </figcaption>
                </figure>
            </article>
        `).join('');

        iniciarLogicaCarrossel();
    }

    // ==========================================
    // 4. PESQUISA (FILTRO DINÂMICO)
    // ==========================================
    searchInput?.addEventListener('input', (e) => {
        const termoBusca = e.target.value.toLowerCase().trim(); 
        const filtradas = listaOriginal.filter(baba => 
            baba.nome.toLowerCase().includes(termoBusca)
        );
        renderizarBabas(filtradas); 
    });

    // ==========================================
    // 5. NAVEGAÇÃO (Caminhos Confirmados pela Árvore)
    // ==========================================
    
    // Botão Sou Babá: Sobe um nível e entra em html_inclusao_babas/formulario/
    btnBaba?.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Navegando para formulário de babás...");
        window.location.href = "../html_inclusao_babas/formulario/interface_inclusao_babas.html";
    });

    // Botão Sou Responsável: Sobe um nível e entra em html_inclusao_respon/
    btnResponsavel?.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Navegando para formulário de responsáveis...");
        window.location.href = "../html_inclusao_respon/interface_inclusao_responsaveis.html";
    });

    // ==========================================
    // 6. LÓGICA DE USUÁRIO LOGADO (LocalStorage)
    // ==========================================
    function verificarUsuarioLogado() {
        const dadosSalvos = window.localStorage.getItem('dados_responsavel');
        const areaVisitante = document.getElementById('area-visitante');
        const areaLogado = document.getElementById('area-logado');
        const nomeUsuarioDisplay = document.getElementById('nome-usuario');
        const btnSair = document.getElementById('btn-sair');

        if (dadosSalvos) {
            const usuario = JSON.parse(dadosSalvos);
            const primeiroNome = usuario.nome.split(' ')[0];

            if (areaVisitante) areaVisitante.classList.add('d-none');
            if (areaLogado) areaLogado.classList.remove('d-none');
            if (nomeUsuarioDisplay) nomeUsuarioDisplay.innerText = primeiroNome;
        }

        btnSair?.addEventListener('click', (e) => {
            e.preventDefault();
            window.localStorage.removeItem('dados_responsavel');
            window.location.reload(); 
        });
    }

    // ==========================================
    // 7. MOTOR DO CARROSSEL
    // ==========================================
    function iniciarLogicaCarrossel() {
        const firstCard = carousel?.querySelector(".card");
        if (!firstCard) return;
        
        const cardWidth = firstCard.offsetWidth + 24; 
        const arrowBtns = document.querySelectorAll(".arrow-btn");

        arrowBtns.forEach(btn => {
            btn.onclick = () => {
                carousel.scrollLeft += btn.id === "left" ? -cardWidth : cardWidth;
            };
        });

        carousel.onscroll = () => {
            let scrollWidth = carousel.scrollWidth - carousel.clientWidth;
            if(arrowBtns[0]) arrowBtns[0].style.visibility = carousel.scrollLeft <= 5 ? "hidden" : "visible";
            if(arrowBtns[1]) arrowBtns[1].style.visibility = carousel.scrollLeft >= scrollWidth - 5 ? "hidden" : "visible";
        };
    }

    // INICIALIZAÇÃO DO SCRIPT
    carregarDadosDaAPI();
    verificarUsuarioLogado();
});

*/
async function renderizarBabas() {
    // Pegando o ID exato que você colocou no HTML
    const container = document.getElementById('carousel-container');

    try {
        // Como o Front e o Back agora moram no mesmo lugar (localhost:3000), 
        // podemos chamar só '/api/babas' direto!
        const resposta = await fetch('/api/babas');
        
        if (!resposta.ok) throw new Error('Erro ao buscar dados do servidor');

        const babas = await resposta.json();

        // Limpa o texto "Carregando babás..."
        container.innerHTML = "";

        // Se o JSON estiver vazio
        if (babas.length === 0) {
            container.innerHTML = "<p class='text-muted w-100 text-center'>Nenhuma babá cadastrada no momento.</p>";
            return;
        }

        // Criando os cards um por um com os dados reais do seu JSON
        babas.forEach(baba => {
            const card = `
                <div class="card shadow-sm mx-2 d-inline-block" style="min-width: 280px; max-width: 280px; flex: 0 0 auto;">
                    <img src="${baba.foto_perfil_nome}" class="card-img-top" alt="Foto de ${baba.nome}" style="height: 250px; object-fit: cover;">
                    <div class="card-body text-start">
                        <h5 class="card-title fw-bold text-dark">${baba.nome}</h5>
                        
                        <p class="card-text text-muted mb-1 d-flex align-items-center">
                            <i class="material-icons fs-6 me-2">phone</i> ${baba.telefone}
                        </p>
                        
                        <p class="card-text text-muted mb-3 d-flex align-items-center">
                            <i class="material-icons fs-6 me-2">email</i> 
                            <span class="d-inline-block text-truncate" style="max-width: 200px;">${baba.email}</span>
                        </p>
                        
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-success rounded-pill">${baba.status_cadastro}</span>
                            <button class="btn btn-outline-primary btn-sm fw-bold rounded-pill">Ver Perfil</button>
                        </div>
                    </div>
                </div>
            `;
            // Adiciona o card dentro do carrossel
            container.innerHTML += card;
        });

    } catch (erro) {
        console.error("Erro fatal:", erro);
        container.innerHTML = "<p class='text-danger w-100 text-center'>Erro ao conectar com o servidor.</p>";
    }
}

// Executa assim que a página abre
window.onload = renderizarBabas;