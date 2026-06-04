// public/js/inclusao_babas/perfil_foto/perfil.js

import api from '../../services/api.js';

// Mapeia os elementos do teu HTML pelos IDs exatos que usaste
const formPerfil = document.querySelector('#form_perfil');
const inputFoto = document.querySelector('#foto_perfil');
const fotoPreview = document.querySelector('#foto_preview');
const placeholderIcon = document.querySelector('#placeholder_icon');

// Função auxiliar que transforma o ficheiro de imagem numa string de texto (Base64)
const transformarImagemEmTexto = (arquivo) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(arquivo);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

let selectedFotoDataUrl = null;

// 🌟 Efeito Visual: Mostra a foto no círculo assim que a babá seleciona o ficheiro
inputFoto.addEventListener('change', async () => {
  if (inputFoto.files && inputFoto.files[0]) {
    const arquivo = inputFoto.files[0];
    selectedFotoDataUrl = await transformarImagemEmTexto(arquivo);

    // Usa a string Base64 para garantir que o preview carregue corretamente
    fotoPreview.src = selectedFotoDataUrl;
    fotoPreview.style.display = 'block';
    placeholderIcon.style.display = 'none'; // Esconde o bonequinho cinzento 👤
  } else {
    selectedFotoDataUrl = null;
    fotoPreview.style.display = 'none';
    placeholderIcon.style.display = 'flex';
    fotoPreview.src = '';
  }
});

// Evento disparado quando se clica em "FINALIZAR CADASTRO"
formPerfil.addEventListener('submit', async (event) => {
  // Impede que a página recarregue e quebre o envio assíncrono (AJAX/Fetch)
  event.preventDefault();

  console.log('🚀 A recolher todos os dados do fluxo de cadastro...');

  try {
    // 1. Recupera a "sacola de dados" que veio lá da primeira tela (formulario)
    const dadosFormularioRaw = window.localStorage.getItem('dados_baba');
    if (!dadosFormularioRaw) {
      alert('Dados de cadastro não encontrados. Por favor, inicie o cadastro novamente.');
      window.location.href = '../formulario/interface_inclusao_babas.html';
      return;
    }

    const dadosFormulario = JSON.parse(dadosFormularioRaw);

    // 2. Captura a imagem selecionada e converte em texto
    let stringDaFoto = selectedFotoDataUrl;
    if (!stringDaFoto && inputFoto.files.length > 0) {
      const arquivoSelecionado = inputFoto.files[0];
      stringDaFoto = await transformarImagemEmTexto(arquivoSelecionado);
    }

    if (!stringDaFoto) {
      alert('Por favor, selecione uma foto de perfil antes de finalizar o seu cadastro!');
      return;
    }

    // 3. Monta o objeto final combinando TUDO (Dados anteriores + Foto)
    // O mapeamento abaixo garante que as propriedades usem os nomes exatos das colunas do banco
    const dadosFinaisParaOBanco = {
      nome: dadosFormulario.nome || 'Nome Não Informado',
      cpf: dadosFormulario.cpf || '00000000000',
      telefone: dadosFormulario.telefone || '000000000',
      email_1: dadosFormulario.email_1 || dadosFormulario.email || 'email@padrao.com',
      email_2: dadosFormulario.email_2 || dadosFormulario.email2 || null,
      foto: stringDaFoto, // A imagem vai aqui convertida numa string gigante de texto
      antecedentes_pdf: dadosFormulario.antecedentes_pdf || null
    };

    console.log('📦 Enviando pacote completo para o servidor...');

    // 4. Dispara para o backend usando a rota relativa da Web (funciona direto no Codespaces)
    const resposta = await api.create('/babas', dadosFinaisParaOBanco);

    console.log('✅ Servidor respondeu com sucesso:', resposta);
    alert('Cadastro finalizado com sucesso! Bem-vinda ao Babysite.');

    // 5. Limpa a memória temporária do navegador para não misturar com o próximo cadastro
    sessionStorage.removeItem('dadosCadastroBaba');

    // 6. Redireciona para a página inicial do projeto
        window.location.href = '/';

  } catch (error) {
    console.error('❌ Erro crítico ao finalizar cadastro:', error);
    alert(`Não foi possível finalizar o cadastro: ${error.message}`);
  }
});