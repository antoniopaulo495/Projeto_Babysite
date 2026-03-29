document.addEventListener('DOMContentLoaded', function() {
    const botaoCadastrar = document.getElementById("cadastra_se");
    const inputAlergias = document.getElementById('Alergias');

    if (botaoCadastrar) {
        console.log("Script de Filhos: Ativado!");

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
                alert("Por favor, digite o nome do seu filho.");
                return;
            }

            // 3. Criamos o objeto do novo filho
            const novo_filho = {
                nome: nomeFilho,
                cpf: cpfFilho,
                documento_alergia: inputAlergias.files.length > 0 ? inputAlergias.files[0].name : "Nenhum arquivo"
            };

            // 4. Adicionamos esse filho à lista (array) de filhos do responsável
            // Lembra que criamos 'filhos: []' no script anterior?
            familia_completa.filhos.push(novo_filho);

            // 5. Salvamos a família atualizada no localStorage
            window.localStorage.setItem('dados_responsavel', JSON.stringify(familia_completa));

            console.log("👨‍👩‍👧‍👦 Família atualizada no sistema:", familia_completa);

            // Pergunta se quer cadastrar mais um ou finalizar
            const querMais = confirm("Filho cadastrado com sucesso! Deseja cadastrar outro filho?");

            if (querMais) {
                // Limpa os campos para o próximo filho
                document.getElementById('Nome').value = "";
                document.getElementById('CPF').value = "";
                inputAlergias.value = "";
            } else {
                alert("Cadastro familiar finalizado!");
                // Aqui você pode mandar para a tela inicial ou um resumo
                // window.location.href = "../index.html";
                window.location.href="../1ºfuncionalidade/1ºfuncionalidade.html"
            }
        });
    }
});