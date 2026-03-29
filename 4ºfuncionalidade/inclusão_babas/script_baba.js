
// Arquivo: script_baba.js (Fica na pasta principal)
const botaoConfirmar = document.getElementById("confirmar");

botaoConfirmar.addEventListener('click', function(event) {
    event.preventDefault(); // Evita recarregar a página

    // Captura os dados usando os IDs exatos do seu primeiro HTML
    const dados_baba = {
        nome: document.getElementById('Nome_baba').value,
        cpf_baba: document.getElementById('cpf_baba').value,
        telefone: document.getElementById('telefone_baba').value,
        email_1: document.getElementById('email_1').value,
        email_2: document.getElementById('email_2').value
    };

    // Salva no navegador
    window.localStorage.setItem('dados_baba', JSON.stringify(dados_baba));
    console.log("Passo 1 concluído. Dados salvos:", dados_baba);

    // Redireciona para a pasta de antecedentes (caminho baseado na sua imagem)
 window.location.href = "../antecedente_criminais/interface_antecedentes_criminais.html";
});