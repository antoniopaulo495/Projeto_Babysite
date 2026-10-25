const account = JSON.parse(localStorage.getItem('babysite_baba') || '{}');
const form = document.getElementById('criminalRecordForm');
const error = document.getElementById('recordError');
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.textContent = '';
  const file = document.getElementById('certidao').files[0];
  if (file && (file.type && file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024)) {
    error.textContent = file.size > 10 * 1024 * 1024
      ? 'A certidão precisa ter no máximo 10 MB.'
      : 'Envie sua certidão no formato PDF.';
    return;
  }
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    if (file) {
      const assinatura = await file.slice(0, 5).text();
      if (assinatura !== '%PDF-') throw new Error('O arquivo selecionado não é um PDF válido.');
      const armazenamento = await import('/js/cadastro/baba/certidao-storage.js');
      await armazenamento.salvarCertidao(file);
      account.antecedentes_criminais = file.name;
    } else if (!account.antecedentes_criminais) {
      account.antecedentes_criminais = 'não enviado';
    }
  } catch (erro) {
    error.textContent = erro.message || 'Não foi possível guardar a certidão neste dispositivo.';
    button.disabled = false;
    return;
  }
  localStorage.setItem('babysite_baba', JSON.stringify(account));
  window.location.href = '../diploma/diploma.html';
});
