const form = document.getElementById('parentBasicForm');
const savedAccount = JSON.parse(localStorage.getItem('babysite_pais') || '{}');

Object.entries(savedAccount).forEach(([name, value]) => {
  const field = form.elements.namedItem(name);
  if (field) field.value = value;
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = { ...savedAccount, ...Object.fromEntries(new FormData(form)), tipo_usuario: 'pais' };
  localStorage.setItem('babysite_pais', JSON.stringify(data));
  window.location.href = '../perfil/perfil.html';
});
