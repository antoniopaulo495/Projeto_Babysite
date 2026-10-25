const rateForm = document.getElementById('sitterRateForm');
const rateAccount = JSON.parse(localStorage.getItem('babysite_baba') || '{}');
const customRate = document.getElementById('customRate');
const rateChoices = [...document.querySelectorAll('[name="rateChoice"]')];
const paymentChoices = [...document.querySelectorAll('[name="paymentMethod"]')];

function updateCustomRateState() {
  const customSelected = rateChoices.some((choice) => choice.checked && choice.value === 'custom');
  customRate.disabled = !customSelected;
  customRate.required = customSelected;
  if (!customSelected) customRate.value = '';
}

if (rateAccount.tarifa_negociavel) {
  rateChoices.find((choice) => choice.value === 'negotiable').checked = true;
} else if (rateAccount.tarifa_hora !== undefined && rateAccount.tarifa_hora !== null) {
  const preset = rateChoices.find((choice) => Number(choice.value) === Number(rateAccount.tarifa_hora));
  if (preset) preset.checked = true;
  else {
    rateChoices.find((choice) => choice.value === 'custom').checked = true;
    customRate.value = rateAccount.tarifa_hora;
  }
}
paymentChoices.forEach((choice) => {
  choice.checked = Array.isArray(rateAccount.formas_pagamento)
    ? rateAccount.formas_pagamento.includes(choice.value)
    : false;
});
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
  const negociavel = selected.value === 'negotiable';
  const rate = negociavel ? null : selected.value === 'custom' ? Number(customRate.value) : Number(selected.value);
  if (!negociavel && (!Number.isFinite(rate) || rate < 25 || rate > 50)) {
    error.textContent = 'Informe uma tarifa entre R$ 25,00 e R$ 50,00 por hora.';
    customRate.focus();
    return;
  }
  const formasPagamento = paymentChoices.filter((choice) => choice.checked).map((choice) => choice.value);
  if (!formasPagamento.length) {
    error.textContent = 'Selecione pelo menos uma forma de pagamento.';
    paymentChoices[0].focus();
    return;
  }
  rateAccount.tarifa_hora = rate;
  rateAccount.tarifa_negociavel = negociavel;
  rateAccount.formas_pagamento = formasPagamento;
  localStorage.setItem('babysite_baba', JSON.stringify(rateAccount));
  window.location.href = '../senha/senha.html';
});
