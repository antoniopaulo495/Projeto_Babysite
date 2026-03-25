let filhos_cadastrados=document.getElementById("cadastra_se")
         
       filhos_cadastrados.addEventListener('click', async function filhos_cadastrados(){
            const nome_filho=document.getElementById("Nome").value
            const cpf_filho=document.getElementById("CPF").value
            const alergia_deficiencia=document.getElementById("Alergias").value

            console.log(nome_filho,cpf_filho,alergia_deficiencia)

            const dados_filho= {
              nome:nome_filho,
              filho_cpf:cpf_filho,
              alergias_deficiencia:alergia_deficiencia,
            }

        })