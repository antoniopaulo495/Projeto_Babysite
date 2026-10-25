const screenNames = {
  inicio: 'INÍCIO',
  perfil: 'PERFIL',
  conversas: 'CONVERSAS',
  entrevistas: 'ENTREVISTAS',
  contratos: 'CONTRATOS',
  pagamentos: 'PAGAMENTOS',
  configuracoes: 'CONFIGURAÇÕES'
};

function showScreen(screen) {
  document.querySelectorAll('.side-link').forEach((item) => item.classList.toggle('active', item.dataset.screen === screen));
  document.querySelectorAll('[data-screen-content]').forEach((item) => item.classList.toggle('active-screen', item.dataset.screenContent === screen));
  document.getElementById('breadcrumbName').textContent = screenNames[screen];
  document.getElementById('screenTitle').textContent = screenNames[screen].charAt(0) + screenNames[screen].slice(1).toLowerCase();
  if (screen === 'conversas' && !activeConversationId && conversations.length) {
    selectConversation(conversations[0].conversa_id);
  }
  document.body.classList.remove('sidebar-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function isoDateToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove('visible'), 2800);
}

async function loadProfile() {
  const token = BabysiteSession.get('pais');
  if (!token) {
    window.location.replace('../home/home.html');
    return;
  }
  try {
    const response = await fetch('/api/sessao', { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401) {
      BabysiteSession.clear('pais', token);
      window.location.replace('../home/home.html');
      return;
    }
    if (!response.ok) throw new Error('Não foi possível carregar seu perfil.');
    const profile = await response.json();
    currentProfile = profile;
    if (profile.tipo_usuario !== 'pais') {
      window.location.replace('../home/home.html');
      return;
    }
    BabysiteSession.remember('pais', token);
    document.getElementById('currentUserNameSidebar').textContent = profile.nome;
    document.getElementById('currentUserEmailSidebar').textContent = profile.email_1;
    document.getElementById('currentUserGreeting').textContent = profile.nome;
    document.querySelector('.user-avatar').textContent = profile.nome.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    const requiredFields = [profile.nome, profile.email_1, profile.telefone];
    const completedFields = requiredFields.filter((value) => Boolean(value)).length;
    document.getElementById('profileCompletion').textContent = `${Math.round(completedFields / requiredFields.length * 100)}%`;
    await loadConversations();
    conversationsPoll = window.setInterval(() => {
      loadConversations();
      loadSchedule();
    }, 5000);
  } catch (error) {
    showToast(error.message);
  }
}

let babysitterProfiles = [];
let currentProfile = null;
let conversations = [];
let activeConversationId = null;
let conversationsPoll = null;
let scheduleLoadVersion = 0;

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function renderBabysitters(profiles = babysitterProfiles) {
  const colors = ['coral', 'teal', 'gold'];
  const dayNames = { segunda: 'Segunda-feira', terca: 'Terça-feira', quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado' };
  const paymentNames = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão' };
  const container = document.getElementById('visitorProfiles');
  document.getElementById('visitorResultCount').textContent = `${profiles.length} perfil${profiles.length === 1 ? '' : 'is'} disponível${profiles.length === 1 ? '' : 'is'}`;
  document.getElementById('activeSitterCount').textContent = babysitterProfiles.length;
  document.getElementById('visitorHeroCount').textContent = babysitterProfiles.length;
  container.innerHTML = profiles.length ? profiles.map((profile, index) => {
    const name = String(profile.nome || 'Profissional');
    const initials = escapeHTML(name.split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase());
    const location = [profile.municipio, profile.estado].filter(Boolean).join(' · ') || 'Localização não informada';
    const rate = profile.tarifa_negociavel
      ? 'Tarifa negociável'
      : profile.tarifa_hora !== null && Number.isFinite(Number(profile.tarifa_hora))
        ? `R$ ${Number(profile.tarifa_hora).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/hora`
        : 'Tarifa não informada';
    const days = (profile.disponibilidade || []).map((item) => dayNames[item.dia_semana]).filter(Boolean);
    const availability = days.length ? days.join(' · ') : 'Disponibilidade não informada';
    const payments = (profile.formas_pagamento || []).map((method) => paymentNames[method]).filter(Boolean);
    const paymentText = payments.length ? payments.join(' · ') : 'Formas de pagamento não informadas';
    return `<article class="visitor-profile"><div class="profile-cover ${colors[index % colors.length]}"><strong>${initials}</strong><span>✓ ${escapeHTML(profile.status_cadastro)}</span></div><div><h3>${escapeHTML(name)}</h3><small>Babá cadastrada</small><p>${escapeHTML(location)}</p><label>${escapeHTML(rate)}</label><label>${escapeHTML(availability)}</label><label>${escapeHTML(paymentText)}</label><button class="secondary-button" type="button" data-profile-baba="${escapeHTML(profile.codigo_baba)}">Ver perfil</button></div></article>`;
  }).join('') : '<p class="muted">Nenhuma babá ativa cadastrada.</p>';
  container.querySelectorAll('[data-profile-baba]').forEach((button) => {
    button.addEventListener('click', () => {
      window.location.href = `perfil_baba/perfil_baba.html?codigo_baba=${encodeURIComponent(button.dataset.profileBaba)}`;
    });
  });
}

async function loadBabysitters() {
  const container = document.getElementById('visitorProfiles');
  try {
    const response = await fetch('/api/babas');
    if (!response.ok) throw new Error('Não foi possível carregar as profissionais.');
    babysitterProfiles = await response.json();
    populateVisitorLocationFilters();
    filterBabysitters();
  } catch (error) {
    container.textContent = error.message;
  }
}

function updateVisitorCityOptions() {
  const state = document.getElementById('visitorStateFilter').value;
  const citySelect = document.getElementById('visitorCityFilter');
  const previousCity = citySelect.value;
  const fictionalCities = ['municipio_1', 'municipio_2', 'municipio_3', 'municipio_4', 'municipio_5'];
  const cities = [...new Set([
    ...fictionalCities,
    ...babysitterProfiles
      .filter((profile) => !state || profile.estado === state)
      .map((profile) => profile.municipio)
      .filter(Boolean)
  ])]
    .sort((first, second) => first.localeCompare(second, 'pt-BR'));
  citySelect.innerHTML = '<option value="">Todos os municípios</option>'
    + cities.map((city) => `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`).join('');
  citySelect.disabled = false;
  if (cities.includes(previousCity)) citySelect.value = previousCity;
}

function populateVisitorLocationFilters() {
  const stateSelect = document.getElementById('visitorStateFilter');
  const stateNames = { AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins', ESTADO_1: 'estado_1', ESTADO_2: 'estado_2', ESTADO_3: 'estado_3', ESTADO_4: 'estado_4', ESTADO_5: 'estado_5' };
  const fictionalStates = ['ESTADO_1', 'ESTADO_2', 'ESTADO_3', 'ESTADO_4', 'ESTADO_5'];
  const states = [...new Set([...fictionalStates, ...babysitterProfiles.map((profile) => profile.estado).filter(Boolean)])].sort();
  stateSelect.innerHTML = '<option value="">Todos os estados</option>'
    + states.map((state) => `<option value="${escapeHTML(state)}">${escapeHTML(stateNames[state] ? `${stateNames[state]} (${state})` : state)}</option>`).join('');
  updateVisitorCityOptions();
}

function getToken() {
  return BabysiteSession.get('pais');
}

async function requestApi(url, options = {}) {
  const token = getToken();
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

function formatMessageTime(date) {
  return new Date(date.replace(' ', 'T') + (date.includes('Z') ? '' : 'Z'))
    .toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function renderConversationLists() {
  const lists = document.querySelectorAll('.conversation-list');
  const count = document.getElementById('conversationCount');
  const navCount = document.getElementById('conversationNavCount');
  if (count) count.textContent = `${conversations.length} conversa${conversations.length === 1 ? '' : 's'}`;
  if (navCount) navCount.textContent = conversations.length;
  lists.forEach((list) => {
    list.innerHTML = `<div class="conversation-list-heading"><span>SUAS CONVERSAS</span><strong>${conversations.length}</strong></div>`
      + (conversations.length ? conversations.map((conversation) => `
      <button class="conversation${Number(conversation.conversa_id) === activeConversationId ? ' active' : ''}"
              type="button" data-conversation-id="${conversation.conversa_id}" aria-pressed="${Number(conversation.conversa_id) === activeConversationId}">
        <span class="avatar coral">${escapeHTML(conversation.nome_contato.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase())}</span>
        <span><strong>${escapeHTML(conversation.nome_contato)}</strong>
        <small>${escapeHTML(conversation.ultima_mensagem || 'Inicie uma conversa')}</small></span>
      </button>`).join('') : '<p class="muted conversation-empty">Nenhuma conversa ainda. Abra o perfil de uma babá para começar.</p>');
  });
}

function renderMessages(messages) {
  const containers = [document.getElementById('messages'), document.querySelector('.large-messages')];
  containers.forEach((container) => {
    container.innerHTML = messages.length ? messages.map((message) => {
      const ownMessage = message.remetente_usuario_codigo === currentProfile?.usuario_codigo;
      return `<div class="message ${ownMessage ? 'sent' : 'received'}">
        <span>${escapeHTML(message.conteudo)}</span>
        <small>${escapeHTML(formatMessageTime(message.enviada_em))}</small>
      </div>`;
    }).join('') : `<p class="muted">${activeConversationId ? 'Nenhuma mensagem. Envie a primeira mensagem.' : 'Selecione uma conversa para ver as mensagens.'}</p>`;
    container.scrollTop = container.scrollHeight;
  });
}

function updateChatHeader(conversation) {
  document.querySelectorAll('#chatName, #chatNameFull').forEach((element) => {
    element.textContent = conversation?.nome_contato || 'Nenhuma conversa selecionada';
  });
  document.querySelectorAll('.chat-top .avatar').forEach((element) => {
    element.textContent = conversation
      ? conversation.nome_contato.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
      : '--';
  });
  document.querySelectorAll('.chat-status').forEach((element) => {
    element.textContent = conversation ? 'Conversa privada · mensagens sincronizadas' : 'Selecione uma conversa para começar';
  });
  document.querySelectorAll('.message-form input, .message-form button').forEach((element) => {
    element.disabled = !conversation;
  });
  document.querySelectorAll('[data-open-interview-request]').forEach((button) => {
    button.disabled = !conversation;
  });
  document.querySelectorAll('[data-open-contract-request]').forEach((button) => {
    button.disabled = !conversation;
  });
}

async function selectConversation(conversationId, refresh = true) {
  const conversation = conversations.find((item) => Number(item.conversa_id) === Number(conversationId));
  if (!conversation) return;
  activeConversationId = Number(conversation.conversa_id);
  renderConversationLists();
  updateChatHeader(conversation);
  if (refresh) {
    try {
      renderMessages(await requestApi(`/api/conversas/${activeConversationId}/mensagens`));
    } catch (error) {
      showToast(error.message);
    }
  }
}

async function loadConversations() {
  try {
    conversations = await requestApi('/api/conversas');
    renderConversationLists();
    const params = new URLSearchParams(window.location.search);
    const requestedId = Number(params.get('conversa_id'));
    const selection = conversations.find((item) => Number(item.conversa_id) === requestedId)
      || conversations.find((item) => Number(item.conversa_id) === activeConversationId)
      || (params.get('screen') === 'conversas' ? conversations[0] : null);
    if (selection) await selectConversation(selection.conversa_id);
    else {
      activeConversationId = null;
      updateChatHeader(null);
      renderMessages([]);
    }
  } catch (error) {
    if (conversationsPoll) {
      window.clearInterval(conversationsPoll);
      conversationsPoll = null;
    }
    showToast(error.message);
  }
}

async function sendMessage(form) {
  const input = form.querySelector('input');
  const conteudo = input.value.trim();
  if (!conteudo || !activeConversationId) return;
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    await requestApi(`/api/conversas/${activeConversationId}/mensagens`, {
      method: 'POST',
      body: JSON.stringify({ conteudo })
    });
    input.value = '';
    await loadConversations();
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = !activeConversationId;
  }
}

function closeInterviewDialog() {
  document.getElementById('interviewRequestDialog').hidden = true;
  document.getElementById('chatInterviewRequestForm').reset();
}

function openInterviewDialog() {
  const conversation = conversations.find((item) => Number(item.conversa_id) === activeConversationId);
  if (!conversation) {
    showToast('Selecione uma conversa antes de solicitar uma entrevista.');
    return;
  }
  document.getElementById('interviewBabysitterName').textContent = conversation.nome_contato;
  const dateInput = document.querySelector('#chatInterviewRequestForm [name="data_entrevista"]');
  dateInput.min = isoDateToday();
  document.getElementById('interviewRequestDialog').hidden = false;
  dateInput.focus();
}

function openContractRequest() {
  const conversation = conversations.find((item) => Number(item.conversa_id) === activeConversationId);
  if (!conversation) {
    showToast('Selecione uma conversa antes de solicitar a contratação.');
    return;
  }
  const profileUrl = new URL('perfil_baba/perfil_baba.html', window.location.href);
  profileUrl.searchParams.set('codigo_baba', conversation.codigo_baba);
  profileUrl.searchParams.set('conversa_id', conversation.conversa_id);
  profileUrl.searchParams.set('acao', 'contratar');
  window.location.href = profileUrl;
}

async function submitInterviewRequest(event) {
  event.preventDefault();
  const conversation = conversations.find((item) => Number(item.conversa_id) === activeConversationId);
  if (!conversation) {
    closeInterviewDialog();
    showToast('Selecione uma conversa antes de solicitar uma entrevista.');
    return;
  }
  const form = event.currentTarget;
  const formData = new FormData(form);
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    await requestApi('/api/solicitacoes/entrevistas', {
      method: 'POST',
      body: JSON.stringify({
        codigo_baba: conversation.codigo_baba,
        data_entrevista: formData.get('data_entrevista'),
        hora_entrevista: formData.get('hora_entrevista'),
        formato: formData.get('formato'),
        mensagem: formData.get('mensagem')
      })
    });
    closeInterviewDialog();
    showToast('Solicitação enviada à babá. A entrevista será registrada se ela aceitar.');
    await loadSchedule();
  } catch (error) {
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
  }
}

function displayDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR');
}

function getContractHours(contract) {
  if (Array.isArray(contract.horarios)) return contract.horarios;
  if (typeof contract.horarios_json !== 'string') return [];
  try {
    const horarios = JSON.parse(contract.horarios_json);
    return Array.isArray(horarios) ? horarios : [];
  } catch (error) {
    console.error(`Não foi possível interpretar os horários do contrato ${contract.solicitacao_id || contract.contrato_id}.`, error);
    return [];
  }
}

function formatCurrency(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderPendingRequests(requests) {
  const target = document.getElementById('pendingRequestList');
  target.innerHTML = requests.length ? requests.map((request) => {
    const title = request.tipo === 'entrevista' ? 'Entrevista' : 'Contratação';
    const date = request.tipo === 'entrevista' ? request.data_entrevista : request.data_inicio;
    const details = request.tipo === 'entrevista'
      ? `${displayDate(date)} às ${request.hora_entrevista} · ${request.formato}`
      : `${displayDate(date)} a ${request.data_fim ? displayDate(request.data_fim) : 'fim não informado'} · ${getContractHours(request).map((item) => `${escapeHTML(item.dia_semana)} ${escapeHTML(item.hora_inicio)}–${escapeHTML(item.hora_fim)}`).join(', ') || 'Horários não informados'}`;
    return `<article class="appointment"><div><strong>${title} · ${escapeHTML(request.nome_baba)}</strong><small>${escapeHTML(details)}</small><small>Status: aguardando resposta da babá</small></div></article>`;
  }).join('') : '<p class="muted">Nenhuma solicitação pendente.</p>';
}

function renderInterviews(interviews) {
  const target = document.getElementById('interviewList');
  target.innerHTML = interviews.length ? interviews.map((item) => `
    <article class="appointment"><div><strong>${escapeHTML(item.nome_baba)}</strong>
    <small>${displayDate(item.data_entrevista)} às ${escapeHTML(item.hora_entrevista)} · ${escapeHTML(item.formato)}</small>
    <small>Status: ${escapeHTML(item.status)}</small>
    </div>${item.status === 'Agendada'
      ? `<button class="secondary-button" type="button" data-finish-interview="${escapeHTML(item.entrevista_id)}">Finalizar entrevista</button>`
      : ''}</article>`).join('')
    : '<p class="muted">Nenhuma entrevista aceita registrada.</p>';
}

function renderContracts(contracts) {
  const target = document.getElementById('contractList');
  target.innerHTML = contracts.length ? contracts.map((item) => `
    <article class="appointment"><div><strong>${escapeHTML(item.nome_baba)} · ${displayDate(item.data_inicio)} a ${item.data_fim ? displayDate(item.data_fim) : 'fim não informado'}</strong>
    <small>${getContractHours(item).map((horario) => `${escapeHTML(horario.dia_semana)} ${escapeHTML(horario.hora_inicio)}–${escapeHTML(horario.hora_fim)}`).join(' · ') || 'Horários não informados'}</small>
    ${item.valor_total === null ? '<small>Custo indisponível: tarifa não informada.</small>' : `<small>Valor previsto: ${formatCurrency(item.valor_total)} · ${item.total_horas} horas de serviço</small>`}
    <small>Status: ${escapeHTML(item.status)}</small>
    ${item.avaliacao_id ? `<small>Sua avaliação: ${item.nota}/5${item.motivos?.length ? ` · ${item.motivos.map(escapeHTML).join(', ')}` : ''}${item.comentario ? ` · ${escapeHTML(item.comentario)}` : ''}</small>` : ''}
    </div>${item.status === 'Concluído' && !item.avaliacao_id
      ? `<button class="primary-button" type="button" data-review-contract="${escapeHTML(item.contrato_id)}">Avaliar</button>` : ''}</article>`).join('')
    : '<p class="muted">Nenhum contrato aceito registrado.</p>';
}

function renderPayments(payments) {
  const target = document.getElementById('paymentList');
  const summary = document.getElementById('paymentSummary');
  const pendentes = payments.filter((payment) => payment.pagamento_status === 'Pendente');
  const pagos = payments.filter((payment) => payment.pagamento_status === 'Pago');
  const valorPendente = pendentes.reduce((total, payment) => total + (Number(payment.valor_total) || 0), 0);
  const valorPago = pagos.reduce((total, payment) => total + (Number(payment.valor_total) || 0), 0);
  summary.innerHTML = `
    <article class="payment-summary-card"><span>Total pendente</span><strong>${formatCurrency(valorPendente)}</strong><small>${pendentes.length} pagamento(s)</small></article>
    <article class="payment-summary-card"><span>Total pago</span><strong>${formatCurrency(valorPago)}</strong><small>${pagos.length} pagamento(s)</small></article>
    <article class="payment-summary-card"><span>Contratos</span><strong>${payments.length}</strong><small>Valores calculados pelo período e horários</small></article>`;
  target.innerHTML = payments.length ? payments.map((payment) => {
    const nome = escapeHTML(payment.nome_baba);
    const horas = getContractHours(payment);
    const descricaoHorarios = horas.map((item) => `${escapeHTML(item.dia_semana)} ${escapeHTML(item.hora_inicio)}–${escapeHTML(item.hora_fim)}`).join(' · ');
    const custo = payment.valor_total === null
      ? '<p>Não foi possível calcular: tarifa ou horários indisponíveis.</p>'
      : `<p>${payment.quantidade_servicos} diária(s) · ${payment.total_horas} horas × ${formatCurrency(payment.tarifa_hora)}/hora</p>`;
    const status = payment.pagamento_status === 'Pago' ? 'Pago' : 'Pendente';
    return `<article class="payment-card">
      <div class="payment-card-details">
        <strong>${nome} · ${displayDate(payment.data_inicio)} a ${displayDate(payment.data_fim)}</strong>
        <small>${descricaoHorarios || 'Horários não informados'}</small>
        ${custo}
        ${payment.pago_em ? `<small>Pago em ${new Date(payment.pago_em).toLocaleDateString('pt-BR')}</small>` : ''}
      </div>
      <div class="payment-card-total">
        <span class="payment-status${status === 'Pago' ? ' paid' : ''}">${status}</span>
        <strong>${payment.valor_total === null ? '—' : formatCurrency(payment.valor_total)}</strong>
        ${status === 'Pendente' && payment.valor_total !== null
          ? `<button class="primary-button" type="button" data-pay-contract="${escapeHTML(payment.contrato_id)}">Pagar</button>` : ''}
      </div>
    </article>`;
  }).join('') : '<p class="muted">Nenhum contrato com pagamento registrado.</p>';
}

function openContractReviewDialog(contratoId) {
  const form = document.getElementById('contractReviewForm');
  form.dataset.contratoId = contratoId;
  document.getElementById('contractReviewTitle').textContent = 'O que você achou do serviço?';
  document.getElementById('reviewDialogEyebrow').textContent = 'AVALIAÇÃO DO SERVIÇO';
  document.getElementById('contractReviewDialog').hidden = false;
  document.querySelector('#contractReviewForm [name="nota"]').focus();
}

function closeContractReviewDialog() {
  document.getElementById('contractReviewDialog').hidden = true;
  document.getElementById('contractReviewForm').reset();
  delete document.getElementById('contractReviewForm').dataset.contratoId;
  document.getElementById('contractReviewTitle').textContent = 'O que você achou do serviço?';
  document.getElementById('reviewDialogEyebrow').textContent = 'AVALIAÇÃO DO SERVIÇO';
  updateReviewCommentRequirement();
}

function updateReviewCommentRequirement() {
  const form = document.getElementById('contractReviewForm');
  const nota = Number(form.elements.nota.value);
  const motivosFieldset = document.getElementById('reviewReasons');
  const motivos = [...form.querySelectorAll('[name="motivos"]')];
  const obrigatorios = nota >= 1 && nota <= 3;
  motivosFieldset.hidden = !obrigatorios;
  motivos.forEach((motivo) => {
    if (!obrigatorios) motivo.checked = false;
    motivo.required = false;
    motivo.setCustomValidity('');
  });
  if (obrigatorios) {
    motivos[0].required = true;
    document.getElementById('reviewReasonsHint').textContent =
      'Os motivos e qualquer comentário serão enviados à babá e, anonimamente, à administração.';
  }
}

async function submitContractReview(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('[type="submit"]');
  const formData = new FormData(form);
  const nota = Number(formData.get('nota'));
  const motivos = formData.getAll('motivos');
  if (nota <= 3 && motivos.length === 0) {
    document.querySelector('#reviewReasons input').setCustomValidity('Selecione ao menos um motivo.');
    document.querySelector('#reviewReasons input').reportValidity();
    return;
  }
  submitButton.disabled = true;
  try {
    await requestApi(`/api/contratos/${form.dataset.contratoId}/avaliacao`, {
      method: 'POST',
      body: JSON.stringify({
        nota,
        comentario: formData.get('comentario'),
        motivos
      })
    });
    closeContractReviewDialog();
    showToast('Avaliação registrada.');
    await loadSchedule();
  } catch (error) {
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
  }
}

async function loadSchedule() {
  const loadVersion = ++scheduleLoadVersion;
  try {
    const [requests, interviews, contracts, payments] = await Promise.all([
      requestApi('/api/solicitacoes/pendentes'),
      requestApi('/api/entrevistas'),
      requestApi('/api/contratos'),
      requestApi('/api/pagamentos')
    ]);
    if (loadVersion !== scheduleLoadVersion) return;
    renderPendingRequests(requests);
    renderInterviews(interviews);
    renderContracts(contracts);
    renderPayments(payments);
    document.querySelector('[data-screen="entrevistas"] .nav-count').textContent = requests.filter((item) => item.tipo === 'entrevista').length + interviews.length;
    document.querySelector('[data-screen="contratos"] .nav-count').textContent = contracts.length;
    document.getElementById('paymentNavCount').textContent = payments.filter((payment) => payment.pagamento_status === 'Pendente').length;
  } catch (error) {
    if (loadVersion === scheduleLoadVersion) showToast(error.message);
  }
}

function filterBabysitters() {
  const query = document.getElementById('visitorSearch').value.trim().toLocaleLowerCase('pt-BR');
  const state = document.getElementById('visitorStateFilter').value;
  const city = document.getElementById('visitorCityFilter').value;
  const rateRange = document.getElementById('visitorRateFilter').value;
  const paymentMethod = document.getElementById('visitorPaymentFilter').value;
  const selectedDays = [...document.querySelectorAll('[name="visitorAvailabilityFilter"]:checked')].map((field) => field.value);
  renderBabysitters(babysitterProfiles.filter((profile) => {
    const nameMatch = !query || String(profile.nome || '').toLocaleLowerCase('pt-BR').includes(query);
    const stateMatch = !state || profile.estado === state;
    const cityMatch = !city || profile.municipio === city;
    const rate = Number(profile.tarifa_hora);
    const rateMatch = !rateRange
      || (rateRange === 'negotiable' && profile.tarifa_negociavel)
      || (rateRange === '25-35' && !profile.tarifa_negociavel
        && Number.isFinite(rate) && rate >= 25 && rate <= 35)
      || (rateRange === '35-50' && !profile.tarifa_negociavel
        && Number.isFinite(rate) && rate >= 35 && rate <= 50);
    const paymentMatch = !paymentMethod || (profile.formas_pagamento || []).includes(paymentMethod);
    const profileDays = new Set((profile.disponibilidade || []).map((item) => item.dia_semana));
    const availabilityMatch = selectedDays.every((day) => profileDays.has(day));
    return nameMatch && stateMatch && cityMatch && rateMatch && paymentMatch && availabilityMatch;
  }));
}

async function logout() {
  const token = BabysiteSession.get('pais');
  if (token) await fetch('/api/sessao', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  BabysiteSession.clear('pais', token);
  window.location.replace('../home/home.html');
}

function bindActions() {
  document.querySelectorAll('.side-link').forEach((item) => {
    item.addEventListener('click', () => showScreen(item.dataset.screen));
  });

  document.querySelectorAll('[data-screen-target]').forEach((item) => {
    item.addEventListener('click', () => showScreen(item.dataset.screenTarget));
  });

  document.querySelectorAll('[data-scroll-target]').forEach((item) => {
    item.addEventListener('click', () => {
      document.getElementById(item.dataset.scrollTarget).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.querySelectorAll('[data-toast]').forEach((item) => {
    item.addEventListener('click', () => showToast(item.dataset.toast || 'Ação concluída.'));
  });

  document.querySelectorAll('[data-logout]').forEach((button) => {
    button.addEventListener('click', logout);
  });
  document.getElementById('paymentList').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-pay-contract]');
    if (!button) return;
    if (!window.confirm('Registrar este contrato como pago na demonstração?')) return;
    button.disabled = true;
    try {
      const result = await requestApi(`/api/pagamentos/${button.dataset.payContract}/pagar`, { method: 'POST' });
      showToast(result.mensagem);
      await loadSchedule();
    } catch (error) {
      button.disabled = false;
      showToast(error.message);
    }
  });

  document.querySelectorAll('[data-open-interview-request]').forEach((button) => {
    button.addEventListener('click', openInterviewDialog);
  });
  document.querySelectorAll('[data-open-contract-request]').forEach((button) => {
    button.addEventListener('click', openContractRequest);
  });
  document.querySelectorAll('[data-close-interview-request]').forEach((button) => {
    button.addEventListener('click', closeInterviewDialog);
  });
  document.getElementById('interviewRequestDialog').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeInterviewDialog();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !document.getElementById('interviewRequestDialog').hidden) closeInterviewDialog();
  });
  document.getElementById('chatInterviewRequestForm').addEventListener('submit', submitInterviewRequest);
  document.getElementById('contractList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-review-contract]');
    if (button) openContractReviewDialog(button.dataset.reviewContract);
  });
  document.getElementById('interviewList').addEventListener('click', async (event) => {
    const finishButton = event.target.closest('[data-finish-interview]');
    if (!finishButton) return;
    if (!window.confirm('Confirma que a entrevista foi realizada e pode ser finalizada?')) return;
    finishButton.disabled = true;
    try {
      const resultado = await requestApi(`/api/entrevistas/${finishButton.dataset.finishInterview}/finalizar`, { method: 'POST' });
      showToast(resultado.mensagem);
      await loadSchedule();
    } catch (error) {
      finishButton.disabled = false;
      showToast(error.message);
    }
  });
  document.querySelectorAll('[data-close-contract-review]').forEach((button) => {
    button.addEventListener('click', closeContractReviewDialog);
  });
  document.getElementById('contractReviewDialog').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeContractReviewDialog();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !document.getElementById('contractReviewDialog').hidden) closeContractReviewDialog();
  });
  document.getElementById('contractReviewForm').addEventListener('submit', submitContractReview);
  document.querySelector('#contractReviewForm [name="nota"]').addEventListener('change', updateReviewCommentRequirement);
  document.querySelectorAll('#reviewReasons [name="motivos"]').forEach((motivo) => {
    motivo.addEventListener('change', () => {
      document.querySelector('#reviewReasons input').setCustomValidity('');
    });
  });

  document.querySelectorAll('.conversation-list').forEach((list) => {
    list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-conversation-id]');
      if (button) selectConversation(button.dataset.conversationId);
    });
  });

  document.querySelectorAll('.message-form').forEach((form) => form.addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage(form);
  }));

}

document.addEventListener('DOMContentLoaded', () => {
  bindActions();
  document.querySelectorAll('#chatInterviewRequestForm input[type="date"]').forEach((field) => { field.min = isoDateToday(); });
  loadProfile();
  const search = document.getElementById('visitorSearch');
  search.addEventListener('input', filterBabysitters);
  document.getElementById('visitorStateFilter').addEventListener('change', () => {
    updateVisitorCityOptions();
    filterBabysitters();
  });
  document.getElementById('visitorCityFilter').addEventListener('change', filterBabysitters);
  document.getElementById('visitorRateFilter').addEventListener('change', filterBabysitters);
  document.getElementById('visitorPaymentFilter').addEventListener('change', filterBabysitters);
  document.querySelectorAll('[name="visitorAvailabilityFilter"]').forEach((field) => {
    field.addEventListener('change', filterBabysitters);
  });
  loadBabysitters();
  if (getToken()) loadSchedule();
  const initialScreen = new URLSearchParams(window.location.search).get('screen');
  if (screenNames[initialScreen]) showScreen(initialScreen);
});
