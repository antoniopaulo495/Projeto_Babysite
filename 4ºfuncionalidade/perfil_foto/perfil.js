// Aguarda o HTML carregar totalmente antes de rodar o JS
document.addEventListener('DOMContentLoaded', function() {
    const inputFoto = document.getElementById('foto_perfil');
    const fotoPreview = document.getElementById('foto_preview');
    const botaoFinalizar = document.getElementById('SalvarPerfil');

    console.log("Sistema de Perfil: Pronto para o upload!");

    // --- 1. LÓGICA DO PREVIEW (VER A FOTO NA TELA) ---
    inputFoto.addEventListener('change', function() {
        const arquivo = this.files[0];
        
        if (arquivo) {
            // Verifica se o que foi subido é realmente uma imagem
            if (!arquivo.type.startsWith('image/')) {
                alert("Por favor, selecione um arquivo de imagem (jpg, png, etc).");
                return;
            }

            const leitor = new FileReader();
            
            leitor.onload = function(e) {
                // Joga a imagem codificada no SRC da tag <img> do HTML
                fotoPreview.src = e.target.result;
                fotoPreview.style.display = 'block'; 
                console.log("Preview da foto gerado com sucesso!");
            }
            
            leitor.readAsDataURL(arquivo);
        }
    });

    // --- 2. LÓGICA DE SALVAMENTO FINAL ---
    botaoFinalizar.addEventListener('click', function(event) {
        event.preventDefault(); // Garante que a página não recarregue

        // Puxa os dados acumulados das páginas 1 e 2
        const dadosSalvos = window.localStorage.getItem('dados_baba');
        
        if (!dadosSalvos) {
            alert("Erro: Não encontramos os dados das etapas anteriores. Volte ao início.");
            return;
        }

        let dados_completos = JSON.parse(dadosSalvos);

        // Verifica se o usuário selecionou a foto
        if (inputFoto.files.length > 0) {
            // Adiciona o nome do arquivo da foto ao objeto principal
            dados_completos.foto_perfil_nome = inputFoto.files[0].name;
            dados_completos.status_cadastro = "Finalizado";

            // Salva o JSON GIGANTE e FINAL no localStorage
            window.localStorage.setItem('dados_baba', JSON.stringify(dados_completos));

            console.log("🏆 CADASTRO 100% CONCLUÍDO:", dados_completos);
            
            alert("Parabéns, " + (dados_completos.nome || "Babá") + "! Seu cadastro foi finalizado com sucesso.");

            window.location.href="../../1º Funcionalidade/interface_site.html"
            
            // Aqui você poderia redirecionar para uma página de "Obrigado" ou "Home"
            // window.location.href = "../index.html";
            
        } else {
            alert("Por favor, selecione uma foto de perfil para concluir o cadastro.");
        }
    });
});