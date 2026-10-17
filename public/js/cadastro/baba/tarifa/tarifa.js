const rateForm = document.getElementById('sitterRateForm');
const rateAccount = JSON.parse(localStorage.getItem('babysite_baba') || '{}');
const customRate = document.getElementById('customRate');
const rateChoices = [...document.querySelectorAll('[name="rateChoice"]')];

function updateCustomRateState() {
  const customSelected = rateChoices.some((choice) => choice.checked && choice.value === 'custom');
  customRate.disabled = !customSelected;
  customRate.required = customSelected;
  if (!customSelected) customRate.value = '';
}

if (rateAccount.tarifa_hora !== undefined && rateAccount.tarifa_hora !== null) {
  const preset = rateChoices.find((choice) => Number(choice.value) === Number(rateAccount.tarifa_hora));
  if (preset) preset.checked = true;
  else {
    rateChoices.find((choice) => choice.value === 'custom').checked = true;
    customRate.value = rateAccount.tarifa_hora;
  }
}
updateCustomRateState();

rateChoices.forEach((choice) => choice.addEventListener('change', updateCustomRateState));

rateForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const error = document.getElementById('rateError');
  error.textContent = '';
  const selected = rateChoices.find((choice) => choice.checked);
  if (!selected) {
    error.textContent = 'Selecione uma tarifa para continuar.';
    return;
  }
  const rate = selected.value === 'custom' ? Number(customRate.value) : Number(selected.value);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 100000) {
    error.textContent = 'Informe uma tarifa válida, maior que zero.';
    customRate.focus();
    return;
  }
  rateAccount.tarifa_hora = rate;
  localStorage.setItem('babysite_baba', JSON.stringify(rateAccount));
  window.location.href = '../senha/senha.html';
});
