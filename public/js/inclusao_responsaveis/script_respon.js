document.addEventListener('DOMContentLoaded', function() {
    const botaoConfirmar = document.getElementById("confirmar");

    if (botaoConfirmar) {
        console.log("🚀 Script do Responsável pronto!");

        botaoConfirmar.addEventListener('click', function(event) {
            event.preventDefault(); // Impede o recarregamento da página

            // 1. Captura os valores dos inputs (IDs conferidos)
            const nomeRespon = document.getElementById('pais').value;
            const cpfRespon = document.getElementById('cpf').value;
            const telRespon = document.getElementById('telefone').value;
            const email1Respon = document.getElementById('email1').value;
            const email2Respon = document.getElementById('email2').value;

            // 2. Validação simples
            if (nomeRespon.trim() === "" || cpfRespon.trim() === "") {
                alert("Por favor, preencha os campos obrigatórios (Nome e CPF).");
                return;
            }

            // 3. Cria o objeto do Responsável (Estrutura para a API)
            const dados_responsavel = {
                nome: nomeRespon,
                cpf: cpfRespon,
                telefone: telRespon,
                email_principal: email1Respon,
                email_secundario: email2Respon,
                tipo_usuario: "Responsável",
                filhos: [] // Lista que será preenchida na próxima tela
            };

            // 4. Salva no localStorage para persistência entre páginas
            window.localStorage.setItem('dados_responsavel', JSON.stringify(dados_responsavel));

            console.log("✅ Dados salvos temporariamente:", dados_responsavel);

            // 5. Redirecionamento para a tela de Filhos
            // Sai da pasta html_inclusao_respon e entra na html_inclusao_filhos
            window.location.href = "../html_inclusao_filhos/interface_inclusao_filhos.html";
        });
    } else {
        console.error("Erro: Botão 'confirmar' não encontrado. Verifique o ID no HTML.");
    }
});