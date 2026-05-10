// Arquivo: perfil_foto.js
document.addEventListener('DOMContentLoaded', function() {
    const inputFoto = document.getElementById('foto_perfil');
    const imgPreview = document.getElementById('foto_preview');
    const placeholder = document.getElementById('placeholder_icon');
    const form = document.getElementById('form_perfil');

    // 1. Lógica para mostrar a foto selecionada (Preview)
    if (inputFoto) {
        inputFoto.addEventListener('change', function() {
            const arquivo = this.files[0];
            if (arquivo) {
                const leitor = new FileReader();
                
                leitor.onload = function(e) {
                    imgPreview.src = e.target.result; // O 'e' traz o resultado do processamento
                    imgPreview.style.display = 'block';
                    if (placeholder) placeholder.style.display = 'none';
                }
                
                leitor.readAsDataURL(arquivo);
            }
        });
    }

    // 2. Lógica para Finalizar e enviar via HTTP Request
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            // Puxa o "pacotão" acumulado (Nome, CPF, Antecedentes)
            const dadosSalvos = window.localStorage.getItem('dados_baba');
            
            if (!dadosSalvos) {
                alert("Erro: Dados iniciais não encontrados. Por favor, reinicie o cadastro.");
                window.location.href = "../formulario/interface_inclusao_babas.html";
                return;
            }

            let dados_completos = JSON.parse(dadosSalvos);

            // 3. Adiciona a foto (em formato Base64 para o servidor conseguir ler)
            if (imgPreview.src && imgPreview.style.display !== 'none') {
                dados_completos.foto_base64 = imgPreview.src;
                dados_completos.nome_arquivo_foto = inputFoto.files[0]?.name || "perfil.jpg";
            } else {
                alert("Por favor, selecione uma foto antes de finalizar.");
                return;
            }

            console.log("🚀 Enviando dados para o servidor...", dados_completos);

            // 4. REQUEST HTTP (FETCH) - O pedido do professor
            fetch('http://localhost:3000/api/babas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dados_completos) // Transforma o objeto em texto JSON
            })
            .then(response => {
                if (response.ok) {
                    alert("Parabéns! Cadastro realizado e salvo no servidor.");
                    
                    // Limpa a "gaveta" pois o cadastro já foi enviado
                    window.localStorage.removeItem('dados_baba');
                    
                    // Redireciona para a Home
                    window.location.href = "../../html_home/home.html";
                } else {
                    throw new Error("Erro ao salvar os dados no servidor.");
                }
            })
            .catch(error => {
                console.error("Erro na requisição:", error);
                alert("O servidor não respondeu. Verifique se o Node.js está rodando.");
            });
        });
    }
});