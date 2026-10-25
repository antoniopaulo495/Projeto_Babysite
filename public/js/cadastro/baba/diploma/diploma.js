const account = JSON.parse(localStorage.getItem('babysite_baba') || '{}');
const form = document.getElementById('diplomaForm');
const input = document.getElementById('diploma');
const error = document.getElementById('diplomaError');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.textContent = '';
  const file = input.files[0];
  if (!file) {
    error.textContent = 'O diploma de cuidadora infantil é obrigatório.';
    return;
  }
  if ((file.type && file.type !== 'application/pdf') || file.size > 10 * 1024 * 1024) {
    error.textContent = file.size > 10 * 1024 * 1024
      ? 'O diploma precisa ter no máximo 10 MB.'
      : 'Envie o diploma no formato PDF.';
    return;
  }

  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    if (await file.slice(0, 5).text() !== '%PDF-') {
      throw new Error('O arquivo selecionado não é um PDF válido.');
    }
    const armazenamento = await import('/js/cadastro/baba/certidao-storage.js');
    await armazenamento.salvarDiploma(file);
    account.diploma = file.name;
    localStorage.setItem('babysite_baba', JSON.stringify(account));
    window.location.href = '../endereco/endereco.html';
  } catch (erro) {
    error.textContent = erro.message || 'Não foi possível guardar o diploma neste dispositivo.';
    button.disabled = false;
  }
});
