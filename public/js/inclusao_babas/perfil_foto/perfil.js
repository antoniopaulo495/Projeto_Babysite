// Arquivo: perfil_foto.js
document.addEventListener('DOMContentLoaded', function() {
    const inputFoto = document.getElementById('foto_perfil');
    const imgPreview = document.getElementById('foto_preview');
    const placeholder = document.getElementById('placeholder_icon');
    const form = document.getElementById('form_perfil');

    // 1. Lógica para mostrar a foto selecionada (Preview)
    // O 'e' aqui é o evento de carregamento, e o result é a imagem processada
    if (inputFoto) {
        inputFoto.addEventListener('change', function() {
            const arquivo = this.files[0];
            if (arquivo) {
                const leitor = new FileReader();
                
                leitor.onload = function(e) {
                    imgPreview.src = e.target.result; // O tal do "resultado do processo"
                    imgPreview.style.display = 'block';
                    if (placeholder) placeholder.style.display = 'none';
                }
                
                leitor.readAsDataURL(arquivo);
            }
        });
    }

    // 2. Lógica para Finalizar e salvar tudo
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            // Pega o que foi acumulado nas telas 1 (Formulário) e 2 (Antecedentes)
            const dadosSalvos = window.localStorage.getItem('dados_baba');
            
            if (!dadosSalvos) {
                alert("Erro: Dados do cadastro não encontrados. Por favor, reinicie o cadastro.");
                return;
            }

            let dados_completos = JSON.parse(dadosSalvos);

            // 3. Adiciona a informação da foto ao objeto final
            if (inputFoto && inputFoto.files[0]) {
                // Salvamos o nome do arquivo e o conteúdo em base64 para o card
                dados_completos.foto_perfil_nome = inputFoto.files[0].name;
                dados_completos.foto_base64 = imgPreview.src; 
                dados_completos.status_cadastro = "Ativa"; // Define um status padrão
            } else {
                alert("Por favor, selecione uma foto de perfil antes de finalizar.");
                return;
            }

            // 4. Salva a versão FINAL no LocalStorage
            window.localStorage.setItem('dados_baba', JSON.stringify(dados_completos));
            
            console.log("CADASTRO CONCLUÍDO COM SUCESSO!", dados_completos);
            alert("Parabéns, " + dados_completos.nome + "! Seu perfil foi criado.");

            // 5. Redireciona para a Home
            // Ajuste o caminho conforme sua pasta (saindo de perfil_foto para a home)
            window.location.href = "../../html_home/home.html";
        });
    }
});