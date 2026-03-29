document.addEventListener('DOMContentLoaded', function() {
    // ==========================================
    // 1. MAPEAMENTO DE ELEMENTOS
    // ==========================================
    const carousel = document.querySelector(".carousel");
    const searchInput = document.getElementById("pesquisar");
    const btnBaba = document.getElementById('baba');
    const btnResponsavel = document.getElementById('responsavel');
    
    // Variável global para guardar a lista e a pesquisa funcionar sempre
    let listaOriginal = []; 

    // ==========================================
    // 2. CARREGAMENTO DOS DADOS (JSON + LocalStorage)
    // ==========================================
    fetch('perfis de babas/babas.json')
        .then(res => {
            if (!res.ok) throw new Error("Erro ao carregar o arquivo JSON");
            return res.json();
        })
        .then(babasDoArquivo => {
            listaOriginal = [...babasDoArquivo]; // Salva na variável global
            
            const dadosLocal = localStorage.getItem('dados_baba');
            if (dadosLocal) {
                const novaBaba = JSON.parse(dadosLocal);
                listaOriginal.unshift(novaBaba); 
            }

            renderizarBabas(listaOriginal); // Desenha a tela pela primeira vez
        })
        .catch(erro => {
            console.error("Erro no carregamento:", erro);
            carousel.innerHTML = "<p style='padding: 20px;'>Não foi possível carregar as babás no momento.</p>";
        });

    // ==========================================
    // 3. FUNÇÃO PARA DESENHAR OS CARDS
    // ==========================================
    function renderizarBabas(lista) {
        if (lista.length === 0) {
            carousel.innerHTML = "<p style='padding: 20px; font-weight: bold;'>Nenhuma babá encontrada.</p>";
            return;
        }

        carousel.innerHTML = lista.map(baba => `
            <article class="card">
                <figure>
                    <img src="${baba.foto_perfil_nome || baba.foto_perfil_src || 'placeholder.png'}" alt="Foto de ${baba.nome}">
                    <figcaption class="card-info">
                        <h3>${baba.nome}</h3>
                        <div class="meta-info">
                            <span class="rating"><i class="material-icons">star</i> 4.9</span>
                            <i class="material-icons dot">fiber_manual_record</i>
                            <span>Verificada</span>
                        </div>
                    </figcaption>
                </figure>
            </article>
        `).join('');

        // Sempre que desenhar cards novos, precisamos religar o motor do carrossel
        iniciarLogicaCarrossel();
    }

    // ==========================================
    // 4. PESQUISA DE BABÁS
    // ==========================================
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const termoBusca = e.target.value.toLowerCase().trim(); 
            
            const babasFiltradas = listaOriginal.filter(baba => 
                baba.nome.toLowerCase().includes(termoBusca)
            );

            renderizarBabas(babasFiltradas); 
        });
    }

    // ==========================================
    // 5. NAVEGAÇÃO DOS BOTÕES DE CADASTRO
    // ==========================================
    if (btnBaba) {
        btnBaba.addEventListener('click', () => {
            window.location.href = "../4ºfuncionalidade/inclusão_babas/interface_inclusao_babas.html";
        });
    }

    if (btnResponsavel) {
        btnResponsavel.addEventListener('click', () => {
            window.location.href = "../2º Funcionalidade/Interface_inclusao_responsaveis.html";
        });
    }

    // ==========================================
    // 6. LÓGICA DO MOTOR DO CARROSSEL
    // ==========================================
    function iniciarLogicaCarrossel() {
        const firstCard = carousel.querySelector(".card");
        if (!firstCard) return; // Se não tiver card na tela, sai da função
        
        const firstCardWidth = firstCard.offsetWidth;
        let isDragging = false, startX, startScrollLeft;

        // Limpa e recria os botões de seta para não acumular cliques ao pesquisar
        const oldArrowBtns = document.querySelectorAll(".arrow-btn");
        oldArrowBtns.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });
        
        const arrowBtns = document.querySelectorAll(".arrow-btn");

        // Lógica de clique nas setas
        arrowBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const scrollAmount = firstCardWidth + 24; 
                carousel.scrollLeft += btn.id === "left" ? -scrollAmount : scrollAmount;
                setTimeout(showHideIcons, 60);
            });
        });

        // Lógica de arrastar com o mouse
        const dragStart = (e) => {
            isDragging = true;
            carousel.classList.add("dragging");
            startX = e.pageX;
            startScrollLeft = carousel.scrollLeft;
        }

        const dragging = (e) => {
            if(!isDragging) return;
            carousel.scrollLeft = startScrollLeft - (e.pageX - startX);
            showHideIcons();
        }

        const dragStop = () => {
            isDragging = false;
            carousel.classList.remove("dragging");
        }

        const showHideIcons = () => {
            let scrollWidth = carousel.scrollWidth - carousel.clientWidth;
            arrowBtns[0].style.display = carousel.scrollLeft <= 5 ? "none" : "flex";
            arrowBtns[1].style.display = Math.ceil(carousel.scrollLeft) >= scrollWidth - 5 ? "none" : "flex";
        }

        carousel.addEventListener("mousedown", dragStart);
        carousel.addEventListener("mousemove", dragging);
        document.addEventListener("mouseup", dragStop);
        carousel.addEventListener("mouseleave", dragStop); 
        carousel.addEventListener("scroll", showHideIcons);
        
        showHideIcons(); // Configura as setas assim que carrega
    }
});