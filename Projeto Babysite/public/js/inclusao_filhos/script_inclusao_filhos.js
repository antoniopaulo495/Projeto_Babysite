document.addEventListener('DOMContentLoaded', function() {
    const botaoCadastrar = document.getElementById("cadastra_se");
    const inputAlergias = document.getElementById('Alergias');

    if (botaoCadastrar) {
        console.log("🚀 Script de Filhos: Ativado!");

        botaoCadastrar.addEventListener('click', function(event) {
            event.preventDefault();

            // 1. Puxamos os dados do Responsável que salvamos na página anterior
            const dadosRespon = window.localStorage.getItem('dados_responsavel');
            
            if (!dadosRespon) {
                alert("Erro: Dados do responsável não encontrados. Volte um passo.");
                return;
            }

            let familia_completa = JSON.parse(dadosRespon);

            // 2. Capturamos os dados do filho atual
            const nomeFilho = document.getElementById('Nome').value;
            const cpfFilho = document.getElementById('CPF').value;
            
            if (nomeFilho.trim() === "") {
                alert("Por favor, digite o nome da criança.");
                return;
            }

            // 3. Criamos o objeto do novo filho
            const novo_filho = {
                nome: nomeFilho,
                cpf: cpfFilho,
                // Pega o nome do arquivo se existir
                documento_alergia: inputAlergias.files.length > 0 ? inputAlergias.files[0].name : "Nenhum arquivo"
            };

            // 4. Adicionamos esse filho à lista do responsável
            familia_completa.filhos.push(novo_filho);

            // 5. Salvamos a família atualizada no localStorage
            window.localStorage.setItem('dados_responsavel', JSON.stringify(familia_completa));
            console.log("👨‍👩‍👧‍👦 Família atualizada no sistema:", familia_completa);

            // 6. Pergunta se quer cadastrar mais um ou finalizar
            const querMais = confirm("Filho cadastrado com sucesso! Deseja cadastrar outro filho?");

            if (querMais) {
                // Limpa os campos para o próximo filho sem sair da página
                document.getElementById('Nome').value = "";
                document.getElementById('CPF').value = "";
                inputAlergias.value = "";
            } else {
                alert("Cadastro familiar finalizado!");
                
                // =======================================================
                // ⚠️ AQUI É ONDE A MÁGICA DA API VAI ACONTECER NO FUTURO!
                // Em vez de só redirecionar, faremos um fetch() disparando
                // o objeto 'familia_completa' via HTTP POST para o Banco de Dados.
                // =======================================================

                // Por enquanto, redirecionamos para a tela inicial (ajuste o caminho se precisar)
              // Sai da pasta html_inclusao_filhos e entra na html_home
              // (Estou assumindo que o nome do seu arquivo HTML principal aí dentro seja home.html)
              window.location.href = "../html_home/home.html"; 
            }
        });
    } else {
        console.error("Erro: Botão de cadastro não encontrado.");
    }
});