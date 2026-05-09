// Arquivo: inclusao_baba.js

document.addEventListener('DOMContentLoaded', function() {
    const formulario = document.getElementById("meu_formulario");

    // Verifica se o formulário existe na página para não dar erro no console
    if (!formulario) {
        console.warn("Aviso: Formulário 'meu_formulario' não encontrado nesta página.");
        return;
    }

    formulario.addEventListener('submit', function(event) {
        event.preventDefault(); 

        // 1. Captura os dados dos inputs com tratamento para evitar campos vazios
        const dados_baba = {
            nome: document.getElementById('Nome_baba')?.value || "",
            cpf: document.getElementById('cpf_baba')?.value || "",
            telefone: document.getElementById('telefone_baba')?.value || "",
            email: document.getElementById('email_1')?.value || "",
            email2: document.getElementById('email_2')?.value || "",
            tipo: "baba", // Identificador importante para o seu futuro banco de dados
            data_cadastro: new Date().toISOString()
        };

        // 2. Validação simples antes de prosseguir
        if (!dados_baba.nome || !dados_baba.email) {
            alert("Por favor, preencha os campos obrigatórios (Nome e E-mail).");
            return;
        }

        // 3. Salva localmente (LocalStorage)
        // Isso permite que você recupere esses dados na tela de antecedentes
        window.localStorage.setItem('dados_baba', JSON.stringify(dados_baba));
        
        console.log("Dados temporários salvos:", dados_baba);

        // 4. Redirecionamento
        // O caminho "../../" sobe duas pastas (sai de js/inclusao_babas para public/)
        // E depois entra em html/html_inclusao_babas/...
        // Ajuste este caminho se o seu arquivo HTML de antecedentes estiver em outro local
        window.location.href = "../antecedentes_criminais/interface_antecedentes_criminais.html";
    });
});