const account = JSON.parse(localStorage.getItem('babysite_baba') || '{}');
const form = document.getElementById('availabilityForm');
const availabilityError = document.getElementById('availabilityError');
const saveButton = document.getElementById('saveAvailability');
const dayFields = [...document.querySelectorAll('[data-availability-day]')];

function setDayEnabled(dayField, enabled) {
  const row = dayField.closest('.availability-row');
  row.querySelectorAll('[data-start-time], [data-end-time]').forEach((field) => {
    field.disabled = !enabled;
    field.required = enabled;
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove('visible'), 2800);
}

dayFields.forEach((dayField) => {
  dayField.addEventListener('change', () => setDayEnabled(dayField, dayField.checked));
});

async function carregarDisponibilidade() {
  if (!account.codigo_perfil) {
    availabilityError.textContent = 'Finalize o cadastro da babá para configurar os horários do perfil.';
    saveButton.disabled = true;
    return;
  }

  try {
    const response = await fetch(`/api/babas/${encodeURIComponent(account.codigo_perfil)}/disponibilidade`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.erro || 'Não foi possível carregar os horários.');

    result.forEach((horario) => {
      const dayField = dayFields.find((field) => field.dataset.availabilityDay === horario.dia_semana);
      if (!dayField) return;
      dayField.checked = true;
      setDayEnabled(dayField, true);
      const row = dayField.closest('.availability-row');
      row.querySelector('[data-start-time]').value = horario.hora_inicio;
      row.querySelector('[data-end-time]').value = horario.hora_fim;
    });
  } catch (error) {
    availabilityError.textContent = error.message || 'Não foi possível conectar ao servidor.';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  availabilityError.textContent = '';
  if (!account.codigo_perfil) {
    availabilityError.textContent = 'Finalize o cadastro da babá para configurar os horários do perfil.';
    return;
  }

  const disponibilidade = dayFields.filter((field) => field.checked).map((dayField) => {
    const row = dayField.closest('.availability-row');
    return {
      dia_semana: dayField.dataset.availabilityDay,
      hora_inicio: row.querySelector('[data-start-time]').value,
      hora_fim: row.querySelector('[data-end-time]').value
    };
  });

  saveButton.disabled = true;
  try {
    const response = await fetch(`/api/babas/${encodeURIComponent(account.codigo_perfil)}/disponibilidade`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('babysite_token') || ''}`
      },
      body: JSON.stringify({ disponibilidade })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.erro || 'Não foi possível salvar os horários.');

    account.disponibilidade = disponibilidade;
    localStorage.setItem('babysite_baba', JSON.stringify(account));
    showToast(result.mensagem);
  } catch (error) {
    availabilityError.textContent = error.message || 'Não foi possível conectar ao servidor.';
  } finally {
    saveButton.disabled = false;
  }
});

carregarDisponibilidade();
