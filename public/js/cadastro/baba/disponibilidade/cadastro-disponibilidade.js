const account = JSON.parse(localStorage.getItem('babysite_baba') || '{}');
const form = document.getElementById('registrationAvailabilityForm');
const availabilityError = document.getElementById('availabilityError');
const dayFields = [...document.querySelectorAll('[data-availability-day]')];

function setDayEnabled(dayField, enabled) {
  const row = dayField.closest('.availability-row');
  row.querySelectorAll('[data-start-time], [data-end-time]').forEach((field) => {
    field.disabled = !enabled;
    field.required = enabled;
  });
}

function restoreAvailability() {
  (account.disponibilidade || []).forEach((horario) => {
    const dayField = dayFields.find((field) => field.dataset.availabilityDay === horario.dia_semana);
    if (!dayField) return;
    dayField.checked = true;
    setDayEnabled(dayField, true);
    const row = dayField.closest('.availability-row');
    row.querySelector('[data-start-time]').value = horario.hora_inicio;
    row.querySelector('[data-end-time]').value = horario.hora_fim;
  });
}

dayFields.forEach((dayField) => {
  dayField.addEventListener('change', () => {
    const row = dayField.closest('.availability-row');
    setDayEnabled(dayField, dayField.checked);
    if (!dayField.checked) {
      row.querySelector('[data-start-time]').value = '';
      row.querySelector('[data-end-time]').value = '';
    }
    availabilityError.textContent = '';
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  availabilityError.textContent = '';
  const selectedDays = dayFields.filter((field) => field.checked);
  if (!selectedDays.length) {
    availabilityError.textContent = 'Selecione pelo menos um dia habitual de trabalho.';
    dayFields[0].focus();
    return;
  }
  if (!form.reportValidity()) return;

  const disponibilidade = selectedDays.map((dayField) => {
    const row = dayField.closest('.availability-row');
    return {
      dia_semana: dayField.dataset.availabilityDay,
      hora_inicio: row.querySelector('[data-start-time]').value,
      hora_fim: row.querySelector('[data-end-time]').value
    };
  });
  if (disponibilidade.some(({ hora_inicio, hora_fim }) => hora_inicio >= hora_fim)) {
    availabilityError.textContent = 'O horário de término precisa ser posterior ao horário de início em cada dia.';
    return;
  }

  account.disponibilidade = disponibilidade;
  localStorage.setItem('babysite_baba', JSON.stringify(account));
  window.location.href = '../tarifa/tarifa.html';
});

restoreAvailability();
