document.addEventListener('DOMContentLoaded', function() {
    const inputFoto = document.getElementById('foto_perfil');
    const imgPreview = document.getElementById('foto_preview');
    const placeholder = document.getElementById('placeholder_icon');
    const form = document.getElementById('form_perfil');

    // 1. Lógica para mostrar a foto selecionada (Preview)
    inputFoto.addEventListener('change', function() {
        const arquivo = this.files[0];
        if (arquivo) {
            const leitor = new FileReader();
            
            leitor.onload = function(e) {
                imgPreview.src = e.target.result;
                imgPreview.style.display = 'block';
                placeholder.style.display = 'none';
            }
            
            leitor.readAsDataURL(arquivo);
        }
    });

    // 2. Lógica para Finalizar
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Pega os dados acumulados das telas anteriores
        const dadosSalvos = window.localStorage.getItem('dados_baba');
        
        if (!dadosSalvos) {
            alert("Erro: Dados do cadastro não encontrados.");
            return;
        }

        let dados_completos = JSON.parse(dadosSalvos);

        // Adiciona a informação da foto (o nome do arquivo por enquanto)
        if (inputFoto.files[0]) {
            dados_completos.foto_perfil = inputFoto.files[0].name;
        }

        // Salva a versão final "bombada" com todos os dados
        window.localStorage.setItem('dados_baba', JSON.stringify(dados_completos));
        
        console.log("CADASTRO COMPLETO!", dados_completos);
        alert("Parabéns! Seu perfil de babá foi criado.");

        // Redireciona para a Home
        // Pela árvore: sai de perfil_foto, sai de html_inclusao_babas, entra em html_home
        window.location.href = "../../html_home/home.html";
    });
});