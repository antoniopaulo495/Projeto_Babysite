const botaoCadastro = document.getElementById("Cadastro");

if (botaoCadastro) {
    botaoCadastro.addEventListener('click', function(event) {
        event.preventDefault(); 

        const dadosSalvos = window.localStorage.getItem('dados_baba');
        const inputArquivo = document.getElementById('antecedentes_criminais');
        
        // Agora pegamos exatamente pelo ID que criamos
        const checkboxTermos = document.getElementById('termo_responsabilidade');

        if (!dadosSalvos) {
            alert("Erro: Dados iniciais não encontrados.");
            return;
        }

        let dados_completos = JSON.parse(dadosSalvos);

        // A REGRA: Tem arquivo OU o checkbox tá marcado (true)?
        if (inputArquivo.files.length > 0 || checkboxTermos.checked) {
            
            // Se tiver arquivo, salva o nome. Se não tiver, salva nada ""
            dados_completos.antecedentes_criminais = inputArquivo.files.length > 0 
                ? inputArquivo.files[0].name 
                : ""; 
            
            window.localStorage.setItem('dados_baba', JSON.stringify(dados_completos));
            
            console.log("Sucesso! Seguindo para foto...");
            window.location.href = "../perfil_foto/perfil.html";

        } else {
            // Se cair aqui, é porque a pessoa não subiu arquivo E não marcou o check
            alert("Atenção: Você precisa anexar o arquivo OU aceitar os termos de responsabilidade.");
        }
    });
}