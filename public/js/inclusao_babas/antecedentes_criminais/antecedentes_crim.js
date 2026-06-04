document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById("form_antecedentes");

    const transformarArquivoEmTexto = (arquivo) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(arquivo);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    if (form) {
        form.addEventListener('submit', async function(event) {
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

            // 2. Validação: arquivo PDF obrigatório e checkbox deve ser marcado
            const temArquivo = inputArquivo && inputArquivo.files.length > 0;
            const aceitouTermos = checkboxTermos && checkboxTermos.checked;

            if (!temArquivo) {
                alert("Atenção: Você precisa anexar o arquivo em formato PDF.");
                return;
            }

            const arquivo = inputArquivo.files[0];
            const nomeArquivo = arquivo.name.toLowerCase();
            const tipoArquivo = arquivo.type;
            const isPdf = tipoArquivo === 'application/pdf' || nomeArquivo.endsWith('.pdf');

            if (!isPdf) {
                alert("Atenção: o arquivo deve ser um PDF válido.");
                return;
            }

            if (!aceitouTermos) {
                alert("Atenção: Você precisa aceitar os termos de responsabilidade.");
                return;
            }

            const arquivoBase64 = await transformarArquivoEmTexto(arquivo);

            // 3. Acrescenta a informação sem apagar o que já existia (Nome, CPF, etc)
            dados_completos.antecedentes_status = `Arquivo enviado: ${arquivo.name}`;
            dados_completos.antecedentes_pdf = arquivoBase64;

            // Salva de volta na mesma etiqueta 'dados_baba'
            window.localStorage.setItem('dados_baba', JSON.stringify(dados_completos));

            console.log("Dados atualizados (Etapa 2 finalizada):", dados_completos);

            // 4. Navegação para a última etapa (Foto de Perfil)
            // O caminho ../ sai de 'antecedentes_criminais' e entra em 'perfil_foto'
            window.location.href = "../perfil_foto/perfil.html";
        });
    }
});