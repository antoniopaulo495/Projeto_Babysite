document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById("form_antecedentes");

    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault(); 

            // 1. Pega os dados que vieram do Formulário inicial
            // Usando 'dados_baba' para bater com o seu script da foto
            const dadosSalvos = window.localStorage.getItem('dados_baba');
            
            const inputArquivo = document.getElementById('antecedentes_criminais');
            const checkboxTermos = document.getElementById('termo_responsabilidade');

            // Validação de segurança: caso o usuário tente pular etapas
            if (!dadosSalvos) {
                alert("Erro: Dados iniciais não encontrados. Por favor, volte ao formulário.");
                window.location.href = "../formulario/interface_inclusao_babas.html";
                return;
            }

            // Converte o texto da "gaveta" em objeto para adicionar mais coisas
            let dados_completos = JSON.parse(dadosSalvos);

            // 2. Validação: Verificamos se há arquivo OU se o checkbox foi marcado
            const temArquivo = inputArquivo && inputArquivo.files.length > 0;
            const aceitouTermos = checkboxTermos && checkboxTermos.checked;

            if (temArquivo || aceitouTermos) {
                
                // 3. Acrescenta a informação sem apagar o que já existia (Nome, CPF, etc)
                dados_completos.antecedentes_status = temArquivo 
                    ? `Arquivo enviado: ${inputArquivo.files[0].name}` 
                    : "Termo de responsabilidade aceito"; 
                
                // Salva de volta na mesma etiqueta 'dados_baba'
                window.localStorage.setItem('dados_baba', JSON.stringify(dados_completos));
                
                console.log("Dados atualizados (Etapa 2 finalizada):", dados_completos);

                // 4. Navegação para a última etapa (Foto de Perfil)
                // O caminho ../ sai de 'antecedentes_criminais' e entra em 'perfil_foto'
                window.location.href = "../perfil_foto/perfil.html";

            } else {
                alert("Atenção: Você precisa anexar o arquivo OU aceitar os termos de responsabilidade.");
            }
        });
    }
});