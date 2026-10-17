const account = JSON.parse(localStorage.getItem('babysite_pais') || '{}');
const form = document.getElementById('parentPasswordForm');
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
  try {
    const response = await fetch('/api/cadastros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...account, tipo_usuario: 'pais', senha: password })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.erro || 'Não foi possível concluir o cadastro.');
    account.usuario_codigo = result.usuario_codigo;
    account.codigo_perfil = result.codigo_perfil;
    delete account.senha;
    localStorage.setItem('babysite_pais', JSON.stringify(account));
    localStorage.setItem('babysite_token', result.token);
    window.location.href = '../../../pais/home-pais.html';
  } catch (requestError) {
    error.textContent = requestError.message || 'Não foi possível conectar ao servidor.';
    submitButton.disabled = false;
  }
});