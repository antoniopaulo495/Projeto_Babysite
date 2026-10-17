const addressForm = document.getElementById('sitterAddressForm');
const addressAccount = JSON.parse(localStorage.getItem('babysite_baba') || '{}');
const addressFields = ['estado', 'municipio'];
const suggestedMunicipalities = ['municipio_1', 'municipio_2', 'municipio_3', 'municipio_4', 'municipio_5'];
const municipalitySuggestions = document.getElementById('municipiosSugeridos');

suggestedMunicipalities.forEach((municipality) => {
  const option = document.createElement('option');
  option.value = municipality;
  municipalitySuggestions.append(option);
});

addressFields.forEach((name) => {
  const field = addressForm.elements.namedItem(name);
  if (field && addressAccount[name]) field.value = addressAccount[name];
});

addressForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const error = document.getElementById('addressError');
  error.textContent = '';
  const values = Object.fromEntries(new FormData(addressForm));
  Object.assign(addressAccount, values, { estado: values.estado.toUpperCase(), municipio: values.municipio.trim() });
  for (const field of ['cep', 'logradouro', 'numero', 'complemento', 'bairro']) delete addressAccount[field];
  localStorage.setItem('babysite_baba', JSON.stringify(addressAccount));
  window.location.href = '../perfil/perfil.html';
});
