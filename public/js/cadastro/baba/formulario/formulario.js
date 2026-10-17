const form = document.getElementById('sitterBasicForm');
const savedAccount = JSON.parse(localStorage.getItem('babysite_baba') || '{}');

Object.entries(savedAccount).forEach(([name, value]) => {
  const field = form.elements.namedItem(name);
  if (field) field.value = value;
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = { ...savedAccount, ...Object.fromEntries(new FormData(form)), tipo_usuario: 'baba' };
  localStorage.setItem('babysite_baba', JSON.stringify(data));
  window.location.href = '../antecedentes_criminais/antecedentes_criminais.html';
});
