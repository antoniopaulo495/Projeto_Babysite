const account = JSON.parse(localStorage.getItem('babysite_baba') || '{}');
const form = document.getElementById('sitterPasswordForm');

function imagemComoArquivo(dataUrl) {
  const [cabecalho, conteudo] = dataUrl.split(',');
  const mime = cabecalho.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
  const binario = atob(conteudo);
  const bytes = new Uint8Array(binario.length);
  for (let indice = 0; indice < binario.length; indice++) bytes[indice] = binario.charCodeAt(indice);
  return new Blob([bytes], { type: mime });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.getElementById('senha').value;
  const confirmation = document.getElementById('confirmar_senha').value;
  const error = document.getElementById('passwordError');
  const submitButton = form.querySelector('button[type="submit"]');
  error.textContent = '';
  if (password.length < 8) { error.textContent = 'A senha deve ter pelo menos 8 caracteres.'; return; }
  if (password !== confirmation) { error.textContent = 'As senhas não conferem.'; return; }
  submitButton.disabled = true;
  let fotoPendente = false;
  let certidaoPendente = false;
  try {
    const fotoPreparada = sessionStorage.getItem('babysite_baba_photo');
    const armazenamentoDocumentos = await import('/js/cadastro/baba/certidao-storage.js');
    const diploma = await armazenamentoDocumentos.obterDiploma();
    if (!diploma) throw new Error('O diploma de cuidadora infantil é obrigatório para concluir o cadastro.');
    const possuiCertidao = account.antecedentes_criminais && account.antecedentes_criminais !== 'não enviado';
    const armazenamentoCertidao = possuiCertidao
      ? armazenamentoDocumentos
      : null;
    const certidaoCadastrada = armazenamentoCertidao ? await armazenamentoCertidao.obterCertidao() : null;
    const dadosCadastro = {
      ...account,
      tipo_usuario: 'baba',
      disponibilidade: account.disponibilidade,
      senha: password
    };
    const cadastro = new FormData();
    cadastro.append('dados', JSON.stringify(dadosCadastro));
    cadastro.append('diploma', diploma, diploma.name || 'diploma.pdf');
    const response = await fetch('/api/cadastros', {
      method: 'POST',
      body: cadastro
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.erro || 'Não foi possível concluir o cadastro.');
    account.usuario_codigo = result.usuario_codigo;
    account.codigo_perfil = result.codigo_perfil;
    delete account.senha;
    localStorage.setItem('babysite_baba', JSON.stringify(account));
    localStorage.setItem('babysite_token_baba', result.token);
    localStorage.setItem('babysite_token', result.token);
    await armazenamentoDocumentos.removerDiploma();
    if (fotoPreparada) {
      const foto = new FormData();
      foto.append('foto', imagemComoArquivo(fotoPreparada), 'perfil.jpg');
      try {
        const respostaFoto = await fetch(`/api/babas/${encodeURIComponent(result.codigo_perfil)}/foto`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${result.token}` },
          body: foto
        });
        fotoPendente = !respostaFoto.ok;
      } catch {
        fotoPendente = true;
      }
      sessionStorage.removeItem('babysite_baba_photo');
    }
    if (certidaoCadastrada) {
      const dadosCertidao = new FormData();
      dadosCertidao.append('certidao', certidaoCadastrada, certidaoCadastrada.name || 'certidao.pdf');
      try {
        const respostaCertidao = await fetch(`/api/babas/${encodeURIComponent(result.codigo_perfil)}/certidao`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${result.token}` },
          body: dadosCertidao
        });
        if (respostaCertidao.ok) await armazenamentoCertidao.removerCertidao();
        else certidaoPendente = true;
      } catch {
        certidaoPendente = true;
      }
    }
    const parametros = new URLSearchParams();
    if (fotoPendente) parametros.set('foto_pendente', '1');
    if (certidaoPendente) parametros.set('certidao_pendente', '1');
    if (result.perfil.diploma_status === 'Pendente') parametros.set('diploma_pendente', '1');
    const query = parametros.size ? `?${parametros}` : '';
    window.location.href = `../../../baba/home-baba.html${query}`;
  } catch (requestError) {
    error.textContent = requestError.message || 'Não foi possível conectar ao servidor.';
    submitButton.disabled = false;
  }
});
