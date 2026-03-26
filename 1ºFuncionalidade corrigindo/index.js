async function carregar_babas() {
    const carrousel=document.getElementById("carousel-container")

    try {
        // 1. Busca os dados (substitua pelo caminho do seu arquivo ou API)
        const resposta = await fetch('dados.json');
        const dados = await resposta.json();

        // 2. Limpa o container antes de inserir (opcional)
        carousel.innerHTML = '';

        // 3. Mapeia os dados para o HTML semântico
        dados.forEach(pessoa => {
            const card = document.createElement('article');
            card.className = 'card';

            card.innerHTML = `
                <figure>
                    <img src="${pessoa.foto}" alt="Foto de ${pessoa.nome}">
                    <figcaption class="card-info">
                        <h3>${pessoa.nome}</h3>
                        <div class="meta-info">
                            <span class="rating">
                                <i class="material-icons star" aria-hidden="true">star</i> 
                                ${pessoa.nota.toFixed(1)}
                            </span>
                            <i class="material-icons dot" aria-hidden="true">fiber_manual_record</i>
                            <span>${pessoa.idade} anos • ${pessoa.idioma}</span>
                        </div>
                    </figcaption>
                </figure>
            `;
            
            carousel.appendChild(card);
        });

    } catch (erro) {
        console.error("Erro ao carregar os dados:", erro);
        carousel.innerHTML = "<p>Não foi possível carregar as informações no momento.</p>";
    }
}
   
    const carousel = document.querySelector(".carousel");
    const arrowBtns = document.querySelectorAll(".arrow-btn");
    const firstCardWidth = carousel.querySelector(".card").offsetWidth;
    let isDragging = false, startX, startScrollLeft;


    arrowBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            // Rola a largura exata de um card + o espaçamento (gap)
            const scrollAmount = firstCardWidth + 24; 
            carousel.scrollLeft += btn.id === "left" ? -scrollAmount : scrollAmount;
            setTimeout(showHideIcons, 60);
        });
    });

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
    carousel.addEventListener("scroll", () => {
        if(window.scrollTimeout) clearTimeout(window.scrollTimeout);
        window.scrollTimeout = setTimeout(showHideIcons, 50);
    });