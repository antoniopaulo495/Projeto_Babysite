const screenNames = {
  inicio: 'INÍCIO',
  perfil: 'PERFIL',
  conversas: 'CONVERSAS',
  entrevistas: 'ENTREVISTAS',
  contratos: 'CONTRATOS',
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
  const token = localStorage.getItem('babysite_token');
  if (!token) {
    window.location.replace('../home/home.html');
    return;
  }
  try {
    const response = await fetch('/api/sessao', { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401) {
      localStorage.removeItem('babysite_token');
      window.location.replace('../home/home.html');
      return;
    }
    if (!response.ok) throw new Error('Não foi possível carregar seu perfil.');
    const profile = await response.json();
    currentProfile = profile;
    if (profile.tipo_usuario !== 'pais') {
      window.location.replace(profile.tipo_usuario === 'baba' ? '../baba/home-baba.html' : '../home/home.html');
      return;
    }
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

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function renderBabysitters(profiles = babysitterProfiles) {
  const colors = ['coral', 'teal', 'gold'];
  const dayNames = { segunda: 'Segunda-feira', terca: 'Terça-feira', quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado' };
  const container = document.getElementById('visitorProfiles');
  document.getElementById('visitorResultCount').textContent = `${profiles.length} perfil${profiles.length === 1 ? '' : 'is'} disponível${profiles.length === 1 ? '' : 'is'}`;
  document.getElementById('activeSitterCount').textContent = babysitterProfiles.length;
  document.getElementById('visitorHeroCount').textContent = babysitterProfiles.length;
  container.innerHTML = profiles.length ? profiles.map((profile, index) => {
    const name = String(profile.nome || 'Profissional');
    const initials = escapeHTML(name.split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase());
    const location = [profile.municipio, profile.estado].filter(Boolean).join(' · ') || 'Localização não informada';
    const rate = profile.tarifa_hora !== null && Number.isFinite(Number(profile.tarifa_hora))
      ? `R$ ${Number(profile.tarifa_hora).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/hora`
      : 'Tarifa não informada';
    const days = (profile.disponibilidade || []).map((item) => dayNames[item.dia_semana]).filter(Boolean);
    const availability = days.length ? days.join(' · ') : 'Disponibilidade não informada';
    return `<article class="visitor-profile"><div class="profile-cover ${colors[index % colors.length]}"><strong>${initials}</strong><span>✓ ${escapeHTML(profile.status_cadastro)}</span></div><div><h3>${escapeHTML(name)}</h3><small>Babá cadastrada</small><p>${escapeHTML(location)}</p><label>${escapeHTML(rate)}</label><label>${escapeHTML(availability)}</label><button class="secondary-button" type="button" data-profile-baba="${escapeHTML(profile.codigo_baba)}">Ver perfil</button></div></article>`;
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
    renderBabysitters();
  } catch (error) {
    container.textContent = error.message;
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
}

function getToken() {
  return localStorage.getItem('babysite_token');
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
    list.innerHTML = conversations.length ? conversations.map((conversation) => `
      <button class="conversation${Number(conversation.conversa_id) === activeConversationId ? ' active' : ''}"
              type="button" data-conversation-id="${conversation.conversa_id}">
        <span class="avatar coral">${escapeHTML(conversation.nome_contato.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase())}</span>
        <span><strong>${escapeHTML(conversation.nome_contato)}</strong>
        <small>${escapeHTML(conversation.ultima_mensagem || 'Inicie uma conversa')}</small></span>
      </button>`).join('') : '<p class="muted">Nenhuma conversa. Abra o perfil de uma babá e escolha “Conversar com a babá”.</p>';
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
  document.querySelectorAll('.chat-status').forEach((element) => {
    element.textContent = conversation ? 'Mensagens sincronizadas' : 'Selecione uma conversa';
  });
  document.querySelectorAll('.message-form input, .message-form button').forEach((element) => {
    element.disabled = !conversation;
  });
  document.querySelectorAll('[data-open-interview-request]').forEach((button) => {
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
    showToast('Selecione uma conversa antes de agendar uma entrevista.');
    return;
  }
  document.getElementById('interviewBabysitterName').textContent = conversation.nome_contato;
  const dateInput = document.querySelector('#chatInterviewRequestForm [name="data_entrevista"]');
  dateInput.min = isoDateToday();
  document.getElementById('interviewRequestDialog').hidden = false;
  dateInput.focus();
}

async function submitInterviewRequest(event) {
  event.preventDefault();
  const conversation = conversations.find((item) => Number(item.conversa_id) === activeConversationId);
  if (!conversation) {
    closeInterviewDialog();
    showToast('Selecione uma conversa antes de agendar uma entrevista.');
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

function renderPendingRequests(requests) {
  const target = document.getElementById('pendingRequestList');
  target.innerHTML = requests.length ? requests.map((request) => {
    const title = request.tipo === 'entrevista' ? 'Entrevista' : 'Contratação';
    const date = request.tipo === 'entrevista' ? request.data_entrevista : request.data_inicio;
    const details = request.tipo === 'entrevista'
      ? `${displayDate(date)} às ${request.hora_entrevista} · ${request.formato}`
      : `${displayDate(date)} a ${request.data_fim ? displayDate(request.data_fim) : 'fim não informado'} · ${request.horarios.map((item) => `${item.dia_semana} ${item.hora_inicio}–${item.hora_fim}`).join(', ')}`;
    return `<article class="appointment"><div><strong>${title} · ${escapeHTML(request.nome_baba)}</strong><small>${escapeHTML(details)}</small><small>Status: aguardando resposta da babá</small></div></article>`;
  }).join('') : '<p class="muted">Nenhuma solicitação pendente.</p>';
}

function renderInterviews(interviews) {
  const target = document.getElementById('interviewList');
  target.innerHTML = interviews.length ? interviews.map((item) => `
    <article class="appointment"><div><strong>${escapeHTML(item.nome_baba)}</strong>
    <small>${displayDate(item.data_entrevista)} às ${escapeHTML(item.hora_entrevista)} · ${escapeHTML(item.formato)}</small>
    <small>Status: ${escapeHTML(item.status)}</small></div></article>`).join('')
    : '<p class="muted">Nenhuma entrevista aceita registrada.</p>';
}

function renderContracts(contracts) {
  const target = document.getElementById('contractList');
  target.innerHTML = contracts.length ? contracts.map((item) => `
    <article class="appointment"><div><strong>${escapeHTML(item.nome_baba)} · ${displayDate(item.data_inicio)} a ${item.data_fim ? displayDate(item.data_fim) : 'fim não informado'}</strong>
    <small>${item.horarios.map((horario) => `${escapeHTML(horario.dia_semana)} ${escapeHTML(horario.hora_inicio)}–${escapeHTML(horario.hora_fim)}`).join(' · ')}</small>
    <small>Status: ${escapeHTML(item.status)}</small>
    ${item.avaliacao_id ? `<small>Sua avaliação: ${item.nota}/5${item.motivos?.length ? ` · ${item.motivos.map(escapeHTML).join(', ')}` : ''}${item.comentario ? ` · ${escapeHTML(item.comentario)}` : ''}</small>` : ''}
    </div>${item.status === 'Concluído' && !item.avaliacao_id
      ? `<button class="primary-button" type="button" data-review-contract="${escapeHTML(item.contrato_id)}">Avaliar</button>` : ''}</article>`).join('')
    : '<p class="muted">Nenhum contrato aceito registrado.</p>';
}

function openContractReviewDialog(contratoId) {
  document.getElementById('contractReviewForm').dataset.contratoId = contratoId;
  document.getElementById('contractReviewDialog').hidden = false;
  document.querySelector('#contractReviewForm [name="nota"]').focus();
}

function closeContractReviewDialog() {
  document.getElementById('contractReviewDialog').hidden = true;
  document.getElementById('contractReviewForm').reset();
  delete document.getElementById('contractReviewForm').dataset.contratoId;
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
  try {
    const [requests, interviews, contracts] = await Promise.all([
      requestApi('/api/solicitacoes/pendentes'),
      requestApi('/api/entrevistas'),
      requestApi('/api/contratos')
    ]);
    renderPendingRequests(requests);
    renderInterviews(interviews);
    renderContracts(contracts);
    document.querySelector('[data-screen="entrevistas"] .nav-count').textContent = requests.filter((item) => item.tipo === 'entrevista').length + interviews.length;
    document.querySelector('[data-screen="contratos"] .nav-count').textContent = contracts.length;
  } catch (error) {
    showToast(error.message);
  }
}

function filterBabysitters() {
  const query = document.getElementById('visitorSearch').value.trim().toLocaleLowerCase('pt-BR');
  const state = document.getElementById('visitorStateFilter').value;
  const city = document.getElementById('visitorCityFilter').value;
  const maxRateValue = document.getElementById('visitorRateFilter').value;
  const maxRate = maxRateValue === '' ? null : Number(maxRateValue);
  const selectedDays = [...document.querySelectorAll('[name="visitorAvailabilityFilter"]:checked')].map((field) => field.value);
  renderBabysitters(babysitterProfiles.filter((profile) => {
    const nameMatch = !query || String(profile.nome || '').toLocaleLowerCase('pt-BR').includes(query);
    const stateMatch = !state || profile.estado === state;
    const cityMatch = !city || profile.municipio === city;
    const rate = Number(profile.tarifa_hora);
    const rateMatch = maxRate === null || (profile.tarifa_hora !== null && Number.isFinite(rate) && rate <= maxRate);
    const profileDays = new Set((profile.disponibilidade || []).map((item) => item.dia_semana));
    const availabilityMatch = selectedDays.every((day) => profileDays.has(day));
    return nameMatch && stateMatch && cityMatch && rateMatch && availabilityMatch;
  }));
}

async function logout() {
  const token = localStorage.getItem('babysite_token');
  if (token) await fetch('/api/sessao', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  localStorage.removeItem('babysite_token');
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

  document.querySelectorAll('[data-open-interview-request]').forEach((button) => {
    button.addEventListener('click', openInterviewDialog);
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
  document.getElementById('visitorRateFilter').addEventListener('input', filterBabysitters);
  document.querySelectorAll('[name="visitorAvailabilityFilter"]').forEach((field) => {
    field.addEventListener('change', filterBabysitters);
  });
  loadBabysitters();
  if (getToken()) loadSchedule();
  const initialScreen = new URLSearchParams(window.location.search).get('screen');
  if (screenNames[initialScreen]) showScreen(initialScreen);
});
