const roleButtons = document.querySelectorAll('.role-button');
const parentFields = document.getElementById('parentFields');
const sitterFields = document.getElementById('sitterFields');
const roleInput = document.getElementById('tipo_usuario');
const form = document.getElementById('signupForm');
const errorMessage = document.getElementById('formError');

function setRole(role) {
  const isSitter = role === 'baba';
  roleInput.value = role;
  roleButtons.forEach((button) => {
    const active = button.dataset.role === role;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  parentFields.hidden = isSitter;
  sitterFields.hidden = !isSitter;
  parentFields.querySelectorAll('input, textarea').forEach((field) => { field.disabled = isSitter; });
  sitterFields.querySelectorAll('input, textarea').forEach((field) => { field.disabled = !isSitter; });
}

function saveAccount(event) {
  event.preventDefault();
  errorMessage.textContent = '';
  const formData = new FormData(form);
  const password = formData.get('senha');
  if (password !== formData.get('confirmar_senha')) {
    errorMessage.textContent = 'As senhas não conferem.';
    document.getElementById('confirmar_senha').focus();
    return;
  }
  if (password.length < 8) {
    errorMessage.textContent = 'A senha precisa ter pelo menos 8 caracteres.';
    document.getElementById('senha').focus();
    return;
  }
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const account = Object.fromEntries(formData.entries());
  account.disponibilidade = formData.getAll('disponibilidade');
  account.criado_em = new Date().toISOString();
  delete account.confirmar_senha;
  delete account.certidao;
  localStorage.setItem(`babysite_${account.tipo_usuario}`, JSON.stringify(account));
  window.location.href = account.tipo_usuario === 'baba' ? '../baba/home-baba.html' : '../pais/home-pais.html';
}

roleButtons.forEach((button) => button.addEventListener('click', () => setRole(button.dataset.role)));
form.addEventListener('submit', saveAccount);
setRole('pais');