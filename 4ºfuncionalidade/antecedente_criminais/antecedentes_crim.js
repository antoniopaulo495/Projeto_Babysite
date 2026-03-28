const botaoCadastro = document.getElementById("Cadastro");

if (botaoCadastro) {
    botaoCadastro.addEventListener('click', function(event) {
        event.preventDefault(); 


        const dadosSalvos = window.localStorage.getItem('dados_baba');
        
        console.log("O que o navegador achou:", dadosSalvos); // Debug no console

        if (!dadosSalvos) {
            alert("Erro crítico: O navegador não encontrou nada salvo com o nome 'dados_baba'.");
            return;
        }

        let dados_completos = JSON.parse(dadosSalvos);
        const inputArquivo = document.getElementById('antecedentes_criminais');

        if (inputArquivo.files.length > 0) {
            dados_completos.antecedentes_criminais = inputArquivo.files[0].name;
            localStorage.setItem('dados_baba', JSON.stringify(dados_completos));
            // No final do sucesso do antecedente_crim.js:
            window.location.href = "../perfil_foto/perfil.html";
            
            console.log("JSON FINAL:", dados_completos);
        } else {
            alert("Selecione um arquivo!");
        }

      

    });
}