document.addEventListener('DOMContentLoaded', function() {
    const botaoConfirmar = document.getElementById("confirmar");

    if (botaoConfirmar) {
        console.log("Script do Responsável carregado com sucesso!");

        botaoConfirmar.addEventListener('click', function(event) {
            event.preventDefault(); // Impede o formulário de recarregar a página

            // 1. Captura os valores dos inputs
            const nomeRespon = document.getElementById('pais').value;
            const cpfRespon = document.getElementById('cpf').value;
            const telRespon = document.getElementById('telefone').value;
            const email1Respon = document.getElementById('email1').value;
            const email2Respon = document.getElementById('email2').value;

            // 2. Validação simples: não deixa salvar se o nome estiver vazio
            if (nomeRespon.trim() === "") {
                alert("Por favor, preencha o nome do responsável.");
                return;
            }

            // 3. Cria o objeto do Responsável
            const dados_responsavel = {
                nome: nomeRespon,
                cpf: cpfRespon,
                telefone: telRespon,
                email_principal: email1Respon,
                email_secundario: email2Respon,
                tipo_usuario: "Responsável",
                filhos: [] // Já deixamos a lista de filhos pronta (vazia) para a próxima etapa
            };

            // 4. Salva no localStorage com uma chave específica
            window.localStorage.setItem('dados_responsavel', JSON.stringify(dados_responsavel));

            console.log("✅ Responsável salvo:", dados_responsavel);
            alert("Cadastro de responsável realizado! Agora, vamos cadastrar seus pequenos.");

            // 5. Redireciona para a 3ª Funcionalidade (Filhos)
            // Ajuste o caminho conforme o nome da sua pasta real
            window.location.href = "../../3ºfuncionalidade/inclusao_filhos.html";
        });
    } else {
        console.error("Botão 'confirmar' não encontrado. Verifique o ID no HTML.");
    }
});