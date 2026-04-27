// Arquivo: antecedentes_crim.js
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById("form_antecedentes");

    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault(); // Impede o refresh da página

            // 1. Pega o que já foi salvo na tela de formulário
            const dadosSalvos = window.localStorage.getItem('dados_baba');
            const inputArquivo = document.getElementById('antecedentes_criminais');
            const checkboxTermos = document.getElementById('termo_responsabilidade');

            if (!dadosSalvos) {
                alert("Erro: Dados iniciais não encontrados. Por favor, volte ao formulário.");
                return;
            }

            let dados_completos = JSON.parse(dadosSalvos);

            // 2. Validação: Arquivo OU Checkbox
            if (inputArquivo.files.length > 0 || checkboxTermos.checked) {
                
                // Salva o nome do arquivo (se houver) ou registra que aceitou os termos
                dados_completos.antecedentes_criminais = inputArquivo.files.length > 0 
                    ? inputArquivo.files[0].name 
                    : "Termo de responsabilidade aceito"; 
                
                // Atualiza o banco local (localStorage)
                window.localStorage.setItem('dados_baba', JSON.stringify(dados_completos));
                
                console.log("Sucesso! Dados atualizados:", dados_completos);

                // ==========================================================
                // 3. O CAMINHO DA ÁRVORE REAL:
                // Você está em: html_inclusao_babas/antecedentes_criminais/
                // Quer ir para: html_inclusao_babas/perfil_foto/
                // ==========================================================
                window.location.href = "../perfil_foto/perfil.html";

            } else {
                alert("Atenção: Você precisa anexar o arquivo OU aceitar os termos de responsabilidade.");
            }
        });
    }
});