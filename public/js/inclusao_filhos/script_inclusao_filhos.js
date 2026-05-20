// Arquivo: inclusao_filhos.js
document.addEventListener('DOMContentLoaded', function() {
    const botaoCadastrar = document.getElementById("cadastra_se");
    const inputAlergias = document.getElementById('Alergias');

    if (botaoCadastrar) {
        botaoCadastrar.addEventListener('click', function(event) {
            event.preventDefault();

            const dadosRespon = window.localStorage.getItem('dados_responsavel');
            
            if (!dadosRespon) {
                alert("Erro: Dados do responsável não encontrados.");
                return;
            }

            let familia_completa = JSON.parse(dadosRespon);

            const nomeFilho = document.getElementById('Nome').value;
            const cpfFilho = document.getElementById('CPF').value;
            
            if (nomeFilho.trim() === "") {
                alert("Por favor, digite o nome da criança.");
                return;
            }

            const novo_filho = {
                nome: nomeFilho,
                cpf: cpfFilho,
                documento_alergia: inputAlergias.files.length > 0 ? inputAlergias.files[0].name : "Nenhum arquivo"
            };

            familia_completa.filhos.push(novo_filho);
            window.localStorage.setItem('dados_responsavel', JSON.stringify(familia_completa));

            const querMais = confirm("Filho cadastrado com sucesso! Deseja cadastrar outro filho?");

            if (querMais) {
                // Limpa campos para o próximo filho
                document.getElementById('Nome').value = "";
                document.getElementById('CPF').value = "";
                inputAlergias.value = "";
            } else {
                // --- INÍCIO DO REQUEST HTTP ---
                console.log("🚀 Enviando família completa para o servidor...", familia_completa);

                fetch('/api/pais', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(familia_completa)
                })
                .then(response => {
                    if (response.ok) {
                        alert("Cadastro familiar finalizado e salvo com sucesso!");
                        window.localStorage.removeItem('dados_responsavel'); // Limpa o cache
                      //  window.location.href = "../html_home/home.html";
                    } else {
                        throw new Error("Erro ao salvar no servidor.");
                    }
                })
                .catch(error => {
                    console.error("Erro na requisição:", error);
                    alert("O servidor não respondeu. Mas seus dados estão salvos no navegador.");
                });
                // --- FIM DO REQUEST HTTP ---
            }
        });
    }
});