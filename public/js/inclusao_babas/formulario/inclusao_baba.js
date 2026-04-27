// Arquivo: inclusao_baba.js
/*document.addEventListener('DOMContentLoaded', function() {
    const formulario = document.getElementById("meu_formulario");

    formulario.addEventListener('submit', async function(event) {
        event.preventDefault(); // Impede o refresh da página

        // 1. Captura os dados dos inputs
        const dados_baba = {
            nome: document.getElementById('Nome_baba').value,
            cpf: document.getElementById('cpf_baba').value,
            telefone: document.getElementById('telefone_baba').value,
            email: document.getElementById('email_1').value,
            email_reserva: document.getElementById('email_2').value
        };

        console.log("Tentando cadastrar babá:", dados_baba);

        try {
            // 2. Chamada da API (Simulando o envio para o servidor)
            // Substitua '/api/babas' pela URL real do seu backend quando estiver pronto
            const resposta = await fetch('http://localhost:3000/api/babas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dados_baba)
            });

            if (resposta.ok) {
                const resultado = await resposta.json();
                console.log("Sucesso no servidor:", resultado);
                
                // 3. Opcional: Salva uma cópia no localStorage para uso rápido na sessão
                window.localStorage.setItem('dados_baba_atual', JSON.stringify(dados_baba));

                // 4. Redireciona para a próxima etapa (Antecedentes)
                // Ajustei o caminho baseado na sua árvore: você está em /formulario/, precisa subir 1 para /html_inclusao_babas/
                window.location.href = "../antecedentes_criminais/interface_antecedentes_criminais.html";
            } else {
                alert("Erro ao salvar no servidor. Verifique os dados.");
            }

        } catch (erro) {
            console.error("Erro de conexão com a API:", erro);
            
            // Plano B: Se a API estiver offline, avisamos o usuário
            alert("Não foi possível conectar ao servidor. Verifique se o backend está rodando!");
        }
    });
});

*/

document.addEventListener('DOMContentLoaded', function() {
    const formulario = document.getElementById("meu_formulario");

    formulario.addEventListener('submit', function(event) {
        event.preventDefault(); 

        const dados_baba = {
            nome: document.getElementById('Nome_baba').value,
            cpf: document.getElementById('cpf_baba').value,
            telefone: document.getElementById('telefone_baba').value,
            email: document.getElementById('email_1').value,
            email_reserva: document.getElementById('email_2').value
        };

        /* --- BLOCO DA API (COMENTADO PARA DEPOIS) ---
        try {
            const resposta = await fetch('http://localhost:3000/api/babas', { ... });
            ...
        } catch (erro) { ... }
        -------------------------------------------
        */

        // Salva localmente para testar se os dados estão sendo capturados
        window.localStorage.setItem('dados_baba_temp', JSON.stringify(dados_baba));
        console.log("Dados salvos no LocalStorage. Partindo para antecedentes...");

        // Redireciona para a próxima tela
        window.location.href = "../antecedentes_criminais/interface_antecedentes_criminais.html";
    });
});