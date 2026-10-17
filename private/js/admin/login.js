const form = document.getElementById('adminLoginForm');
const errorMessage = document.getElementById('loginError');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Validando acesso...';

  try {
    const response = await fetch('/admin/api/sessao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.elements.email.value,
        senha: form.elements.senha.value
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.erro || 'Não foi possível entrar.');

    sessionStorage.setItem('babysite-admin-token', result.token);
    window.location.assign('/html/admin/home-admin.html');
  } catch (error) {
    errorMessage.textContent = error.message || 'Não foi possível conectar ao servidor.';
    errorMessage.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = 'Entrar no painel';
  }
});
