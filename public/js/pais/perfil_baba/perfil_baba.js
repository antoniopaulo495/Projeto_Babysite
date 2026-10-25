const weekdays = [
  ['segunda', 'Segunda-feira'], ['terca', 'Terça-feira'], ['quarta', 'Quarta-feira'],
  ['quinta', 'Quinta-feira'], ['sexta', 'Sexta-feira'], ['sabado', 'Sábado']
];

let selectedBabysitter = null;

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove('visible'), 3000);
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function isoDateToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

async function requestApi(url, options = {}) {
  const token = BabysiteSession.get('pais');
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.erro || 'Não foi possível concluir a solicitação.');
  }
  return response.status === 204 ? null : response.json();
}

function renderContractScheduleFields() {
  document.getElementById('contractScheduleFields').innerHTML = weekdays.map(([day, label]) => `
    <div class="schedule-day">
      <label><input type="checkbox" name="dia_semana" value="${day}"> ${label}</label>
      <label>De <input type="time" name="${day}_inicio" disabled required></label>
      <label>Até <input type="time" name="${day}_fim" disabled required></label>
    </div>`).join('');

  document.querySelectorAll('#contractScheduleFields input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const row = checkbox.closest('.schedule-day');
      row.classList.toggle('selected', checkbox.checked);
      row.querySelectorAll('input[type="time"]').forEach((field) => {
        field.disabled = !checkbox.checked;
        field.required = checkbox.checked;
      });
    });
  });
}

async function loadBabysitter() {
  const codigoBaba = new URLSearchParams(window.location.search).get('codigo_baba');
  if (!codigoBaba) throw new Error('O perfil solicitado não foi identificado.');

  const conversaId = new URLSearchParams(window.location.search).get('conversa_id');
  if (conversaId) {
    document.querySelector('.back-to-search').href =
      `../home-pais.html?screen=conversas&conversa_id=${encodeURIComponent(conversaId)}`;
  }

  const [perfil, disponibilidade] = await Promise.all([
    requestApi(`/api/babas/${encodeURIComponent(codigoBaba)}`),
    requestApi(`/api/babas/${encodeURIComponent(codigoBaba)}/disponibilidade`)
  ]);
  selectedBabysitter = perfil;
  document.title = `Babysite | ${perfil.nome}`;
  document.getElementById('babysitterProfileName').textContent = perfil.nome;
  document.getElementById('babysitterProfileHeading').textContent = perfil.nome;
  document.getElementById('babysitterProfileStatus').textContent = 'Perfil ativo';
  document.getElementById('babysitterProfileAvatar').textContent = perfil.nome.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const detalhes = [
    [perfil.municipio, perfil.estado].filter(Boolean).join(' · '),
    perfil.tarifa_negociavel
      ? 'Tarifa negociável'
      : perfil.tarifa_hora == null
        ? ''
        : `R$ ${Number(perfil.tarifa_hora).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por hora`
  ].filter(Boolean);
  document.getElementById('babysitterProfileSummary').textContent =
    detalhes.length ? detalhes.join(' · ') : 'Localização e tarifa ainda não informadas.';
  const tarifaDisponivel = !perfil.tarifa_negociavel
    && perfil.tarifa_hora !== null
    && perfil.tarifa_hora !== undefined
    && Number.isFinite(Number(perfil.tarifa_hora));
  document.getElementById('showContractForm').disabled = !tarifaDisponivel;
  document.getElementById('contractRateNotice').hidden = tarifaDisponivel;
  document.getElementById('contractRateSummary').textContent = tarifaDisponivel
    ? `Valor acordado por hora: R$ ${Number(perfil.tarifa_hora).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. O total será calculado pelo período e horários escolhidos.`
    : 'A babá ainda não informou uma tarifa fixa.';
  const paymentNames = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão' };
  const formasPagamento = (perfil.formas_pagamento || []).map((forma) => paymentNames[forma]).filter(Boolean);
  document.getElementById('babysitterPaymentMethods').textContent = formasPagamento.length
    ? `Aceita: ${formasPagamento.join(' · ')}`
    : 'Formas de pagamento não informadas.';

  const target = document.getElementById('babysitterAvailability');
  target.innerHTML = disponibilidade.length
    ? disponibilidade.map((item) => `<div class="appointment"><strong>${escapeHTML(weekdays.find(([day]) => day === item.dia_semana)?.[1] || item.dia_semana)}</strong><span>${escapeHTML(item.hora_inicio)}–${escapeHTML(item.hora_fim)}</span></div>`).join('')
    : '<p class="muted">A babá ainda não cadastrou disponibilidade habitual.</p>';
}

function bindActions() {
  document.getElementById('showInterviewForm').addEventListener('click', () => {
    document.getElementById('contractRequestPanel').hidden = true;
    const panel = document.getElementById('interviewRequestPanel');
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('showContractForm').addEventListener('click', () => {
    document.getElementById('interviewRequestPanel').hidden = true;
    const panel = document.getElementById('contractRequestPanel');
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('openConversationButton').addEventListener('click', () => {
    requestApi('/api/conversas', {
      method: 'POST',
      body: JSON.stringify({ codigo_baba: selectedBabysitter.codigo_baba })
    }).then((conversa) => {
      window.location.href = `../home-pais.html?screen=conversas&conversa_id=${encodeURIComponent(conversa.conversa_id)}`;
    }).catch((error) => showToast(error.message));
  });

  document.querySelectorAll('[data-close-request]').forEach((button) => {
    button.addEventListener('click', () => { button.closest('.request-form-panel').hidden = true; });
  });

  document.getElementById('interviewRequestForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      await requestApi('/api/solicitacoes/entrevistas', {
        method: 'POST',
        body: JSON.stringify({
          codigo_baba: selectedBabysitter.codigo_baba,
          data_entrevista: formData.get('data_entrevista'),
          hora_entrevista: formData.get('hora_entrevista'),
          formato: formData.get('formato'),
          mensagem: formData.get('mensagem')
        })
      });
      form.reset();
      document.getElementById('interviewRequestPanel').hidden = true;
      showToast('Solicitação enviada. Ela aparecerá na agenda após a babá aceitar.');
    } catch (error) {
      showToast(error.message);
    }
  });

  document.getElementById('contractRequestForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const tarifaDisponivel = selectedBabysitter
      && !selectedBabysitter.tarifa_negociavel
      && selectedBabysitter.tarifa_hora !== null
      && selectedBabysitter.tarifa_hora !== undefined
      && Number.isFinite(Number(selectedBabysitter.tarifa_hora));
    if (!tarifaDisponivel) {
      showToast('A babá precisa informar uma tarifa fixa antes da contratação.');
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    const horarios = weekdays.flatMap(([dia]) => {
      if (!form.querySelector(`input[name="dia_semana"][value="${dia}"]`).checked) return [];
      return [{
        dia_semana: dia,
        hora_inicio: formData.get(`${dia}_inicio`),
        hora_fim: formData.get(`${dia}_fim`)
      }];
    });
    if (!horarios.length) {
      showToast('Escolha pelo menos um dia e informe o horário de trabalho.');
      return;
    }
    try {
      await requestApi('/api/solicitacoes/contratos', {
        method: 'POST',
        body: JSON.stringify({
          codigo_baba: selectedBabysitter.codigo_baba,
          data_inicio: formData.get('data_inicio'),
          data_fim: formData.get('data_fim'),
          horarios,
          mensagem: formData.get('mensagem')
        })
      });
      form.reset();
      form.querySelectorAll('.schedule-day').forEach((row) => {
        row.classList.remove('selected');
        row.querySelectorAll('input[type="time"]').forEach((field) => {
          field.disabled = true;
          field.required = false;
        });
      });
      document.getElementById('contractRequestPanel').hidden = true;
      showToast('Solicitação enviada. O contrato será criado após a babá aceitar.');
    } catch (error) {
      showToast(error.message);
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  renderContractScheduleFields();
  document.querySelectorAll('input[type="date"]').forEach((field) => { field.min = isoDateToday(); });
  const contractStartDate = document.querySelector('#contractRequestForm [name="data_inicio"]');
  const contractEndDate = document.querySelector('#contractRequestForm [name="data_fim"]');
  contractStartDate.addEventListener('change', () => {
    contractEndDate.min = contractStartDate.value || isoDateToday();
    if (contractEndDate.value && contractEndDate.value < contractEndDate.min) contractEndDate.value = '';
  });
  bindActions();

  const token = BabysiteSession.get('pais');
  if (!token) {
    window.location.replace('/html/home/home.html');
    return;
  }

  try {
    const profile = await requestApi('/api/sessao');
    if (profile.tipo_usuario !== 'pais') {
      window.location.replace('/html/home/home.html');
      return;
    }
    BabysiteSession.remember('pais', token);
    document.getElementById('currentUserName').textContent = profile.nome;
    await loadBabysitter();
    if (new URLSearchParams(window.location.search).get('acao') === 'contratar') {
      document.getElementById('showContractForm').click();
    }
  } catch (error) {
    showToast(error.message);
  }
});
