const screenNames = {
  inicio: 'INÍCIO',
  perfil: 'PERFIL',
  documentos: 'CERTIDÃO',
  entrevistas: 'ENTREVISTAS',
  contratos: 'CONTRATOS',
  conversas: 'CONVERSAS'
};

let currentProfile = null;
let conversations = [];
let activeConversationId = null;
let conversationsPoll = null;

function showScreen(screen) {
  document.querySelectorAll('.side-link').forEach((item) => item.classList.toggle('active', item.dataset.screen === screen));
  document.querySelectorAll('[data-screen-content]').forEach((item) => item.classList.toggle('active-screen', item.dataset.screenContent === screen));
  document.getElementById('breadcrumbName').textContent = screenNames[screen];
  document.getElementById('screenTitle').textContent = screen === 'inicio' ? 'Visão geral' : screenNames[screen].charAt(0) + screenNames[screen].slice(1).toLowerCase();
  if (screen === 'conversas' && !activeConversationId && conversations.length) {
    selectConversation(conversations[0].conversa_id);
  }
  document.body.classList.remove('sidebar-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (profile.tipo_usuario !== 'baba') {
      window.location.replace(profile.tipo_usuario === 'pais' ? '../pais/home-pais.html' : '../home/home.html');
      return;
    }
    currentProfile = profile;
    document.getElementById('currentUserNameSidebar').textContent = profile.nome;
    document.getElementById('currentUserEmailSidebar').textContent = profile.email_1;
    document.getElementById('currentUserAvatar').textContent = profile.nome.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    document.getElementById('profileName').value = profile.nome;
    await loadBabaProfile();
    const status = document.getElementById('profileStatus');
    const active = profile.status_cadastro === 'Ativa';
    status.textContent = active ? '✓ Perfil ativo' : '◉ Perfil em análise';
    status.classList.toggle('good', active);
    status.classList.toggle('pending', !active);
    await loadSchedule();
    await loadConversations();
    conversationsPoll = window.setInterval(() => {
      loadSchedule();
      loadConversations();
    }, 5000);
  } catch (error) {
    showToast(error.message);
  }
}

async function requestApi(url, options = {}) {
  const token = localStorage.getItem('babysite_token');
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

async function loadBabaProfile() {
  try {
    const profile = await requestApi(`/api/babas/${encodeURIComponent(currentProfile.codigo_perfil)}/perfil`);
    document.getElementById('profileRateInput').value = profile.tarifa_hora ?? '';
    document.getElementById('profileStateInput').value = profile.estado || '';
    document.getElementById('profileCityInput').value = profile.municipio || '';
    document.getElementById('currentRate').textContent = profile.tarifa_hora == null
      ? '--'
      : `R$ ${Number(profile.tarifa_hora).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    document.getElementById('currentRateStatus').textContent = profile.tarifa_hora == null
      ? 'Tarifa não cadastrada'
      : 'Valor por hora';
  } catch (error) {
    showToast(error.message);
  }
}

async function saveBabaProfile(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('[type="submit"]');
  const tarifaValue = document.getElementById('profileRateInput').value;
  submitButton.disabled = true;
  try {
    const result = await requestApi(`/api/babas/${encodeURIComponent(currentProfile.codigo_perfil)}/perfil`, {
      method: 'PUT',
      body: JSON.stringify({
        tarifa_hora: tarifaValue === '' ? null : Number(tarifaValue),
        estado: document.getElementById('profileStateInput').value,
        municipio: document.getElementById('profileCityInput').value
      })
    });
    showToast(result.mensagem);
    await loadBabaProfile();
  } catch (error) {
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
  }
}

function formatMessageTime(date) {
  return new Date(date.replace(' ', 'T') + (date.includes('Z') ? '' : 'Z'))
    .toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function renderConversationList() {
  const list = document.querySelector('.conversation-list');
  list.innerHTML = conversations.length ? conversations.map((conversation) => `
    <button class="conversation${Number(conversation.conversa_id) === activeConversationId ? ' active' : ''}"
            type="button" data-conversation-id="${conversation.conversa_id}">
      <span class="avatar coral">${escapeHTML(conversation.nome_contato.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase())}</span>
      <span><strong>${escapeHTML(conversation.nome_contato)}</strong>
      <small>${escapeHTML(conversation.ultima_mensagem || 'Inicie uma conversa')}</small></span>
    </button>`).join('') : '<p class="muted">Nenhuma conversa iniciada. Quando um responsável iniciar uma conversa, ela aparecerá aqui.</p>';
}

function renderMessages(messages) {
  const container = document.querySelector('.large-messages');
  container.innerHTML = messages.length ? messages.map((message) => {
    const ownMessage = message.remetente_usuario_codigo === currentProfile?.usuario_codigo;
    return `<div class="message ${ownMessage ? 'sent' : 'received'}">
      <span>${escapeHTML(message.conteudo)}</span>
      <small>${escapeHTML(formatMessageTime(message.enviada_em))}</small>
    </div>`;
  }).join('') : `<p class="muted">${activeConversationId ? 'Nenhuma mensagem. Envie a primeira mensagem.' : 'Selecione uma conversa para ver as mensagens.'}</p>`;
  container.scrollTop = container.scrollHeight;
}

function updateChatHeader(conversation) {
  document.getElementById('chatName').textContent = conversation?.nome_contato || 'Nenhuma conversa selecionada';
  document.querySelectorAll('.chat-status').forEach((element) => {
    element.textContent = conversation ? 'Mensagens sincronizadas' : 'Selecione uma conversa';
  });
  document.querySelectorAll('.message-form input, .message-form button').forEach((element) => {
    element.disabled = !conversation;
  });
}

async function selectConversation(conversationId) {
  const conversation = conversations.find((item) => Number(item.conversa_id) === Number(conversationId));
  if (!conversation) return;
  activeConversationId = Number(conversation.conversa_id);
  renderConversationList();
  updateChatHeader(conversation);
  try {
    renderMessages(await requestApi(`/api/conversas/${activeConversationId}/mensagens`));
  } catch (error) {
    showToast(error.message);
  }
}

async function loadConversations() {
  try {
    conversations = await requestApi('/api/conversas');
    renderConversationList();
    const selected = conversations.find((item) => Number(item.conversa_id) === activeConversationId) || conversations[0];
    if (selected) await selectConversation(selected.conversa_id);
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

function displayDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR');
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function renderRequests(requests) {
  const list = document.getElementById('requestList');
  document.getElementById('pendingRequestCount').textContent = requests.length;
  list.innerHTML = requests.length ? requests.map((request) => {
    const id = escapeHTML(request.solicitacao_id);
    const title = request.tipo === 'entrevista' ? 'Entrevista' : 'Contratação';
    const description = request.tipo === 'entrevista'
      ? `${displayDate(request.data_entrevista)} às ${escapeHTML(request.hora_entrevista)} · ${escapeHTML(request.formato)}`
      : `${displayDate(request.data_inicio)} a ${request.data_fim ? displayDate(request.data_fim) : 'fim não informado'} · ${request.horarios.map((item) => `${escapeHTML(item.dia_semana)} ${escapeHTML(item.hora_inicio)}–${escapeHTML(item.hora_fim)}`).join(', ')}`;
    return `<article class="request-item">
      <span class="avatar coral">${escapeHTML(request.nome_pais.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase())}</span>
      <div><strong>${title} · ${escapeHTML(request.nome_pais)}</strong><small>${description}</small>${request.mensagem ? `<span>${escapeHTML(request.mensagem)}</span>` : ''}</div>
      <div class="request-actions">
        <button class="approve-button" data-request-action="aceitar" data-request-type="${request.tipo}" data-request-id="${id}">Aceitar</button>
        <button class="decline-button" data-request-action="recusar" data-request-type="${request.tipo}" data-request-id="${id}">Recusar</button>
      </div>
    </article>`;
  }).join('') : '<p class="muted">Nenhuma solicitação pendente.</p>';
  document.getElementById('requestPreview').innerHTML = requests.length
    ? `<p class="muted">${requests.length} solicitação(ões) aguardando sua resposta.</p>`
    : '<p class="muted">Nenhuma solicitação pendente.</p>';
}

function renderInterviews(interviews) {
  const target = document.getElementById('interviewList');
  target.innerHTML = interviews.length ? interviews.map((item) => `
    <article class="appointment"><div><strong>${escapeHTML(item.nome_pais)}</strong>
    <small>${displayDate(item.data_entrevista)} às ${escapeHTML(item.hora_entrevista)} · ${escapeHTML(item.formato)}</small>
    <small>Status: ${escapeHTML(item.status)}</small></div></article>`).join('')
    : '<p class="muted">Nenhuma entrevista aceita registrada.</p>';
}

function renderContracts(contracts) {
  const target = document.getElementById('contractList');
  target.innerHTML = contracts.length ? contracts.map((item) => `
    <article class="appointment"><div><strong>${escapeHTML(item.nome_pais)} · ${displayDate(item.data_inicio)} a ${item.data_fim ? displayDate(item.data_fim) : 'fim não informado'}</strong>
    <small>${item.horarios.map((horario) => `${escapeHTML(horario.dia_semana)} ${escapeHTML(horario.hora_inicio)}–${escapeHTML(horario.hora_fim)}`).join(' · ')}</small>
    <small>Status: ${escapeHTML(item.status)}</small>
    ${item.avaliacao_id ? `<small>Avaliação recebida: ${item.nota}/5${item.motivos?.length ? ` · Motivos: ${item.motivos.map(escapeHTML).join(', ')}` : ''}${item.comentario ? ` · ${escapeHTML(item.comentario)}` : ''}</small>` : ''}
    </div>
    ${item.status === 'Ativo'
      ? `<button class="primary-button" type="button" data-finish-contract="${escapeHTML(item.contrato_id)}">Finalizar serviço</button>` : ''}</article>`).join('')
    : '<p class="muted">Nenhum contrato aceito registrado.</p>';
}

async function loadSchedule() {
  try {
    const [requests, interviews, contracts] = await Promise.all([
      requestApi('/api/solicitacoes/pendentes'),
      requestApi('/api/entrevistas'),
      requestApi('/api/contratos')
    ]);
    renderRequests(requests);
    renderInterviews(interviews);
    renderContracts(contracts);
    document.getElementById('interviewCount').textContent = interviews.length;
    document.getElementById('contractCount').textContent = contracts.length;
  } catch (error) {
    showToast(error.message);
  }
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

  document.querySelectorAll('[data-toast]').forEach((item) => {
    item.addEventListener('click', () => showToast(item.dataset.toast || 'Ação concluída.'));
  });

  document.getElementById('requestList').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-request-action]');
    if (!button) return;
    const action = button.dataset.requestAction;
    const type = button.dataset.requestType;
    const method = action === 'aceitar' ? 'POST' : 'DELETE';
    const endpoint = `/api/solicitacoes/${type === 'entrevista' ? 'entrevistas' : 'contratos'}/${button.dataset.requestId}${action === 'aceitar' ? '/aceitar' : ''}`;
    button.disabled = true;
    try {
      const resultado = await requestApi(endpoint, { method });
      showToast(resultado?.mensagem || 'Solicitação recusada.');
      await loadSchedule();
    } catch (error) {
      button.disabled = false;
      showToast(error.message);
    }
  });

  document.getElementById('contractList').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-finish-contract]');
    if (!button) return;
    if (!window.confirm('Confirma que o serviço deste contrato foi concluído?')) return;
    button.disabled = true;
    try {
      const resultado = await requestApi(`/api/contratos/${button.dataset.finishContract}/finalizar`, { method: 'POST' });
      showToast(resultado.mensagem);
      await loadSchedule();
    } catch (error) {
      button.disabled = false;
      showToast(error.message);
    }
  });

  document.querySelector('.conversation-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-conversation-id]');
    if (button) selectConversation(button.dataset.conversationId);
  });

  document.getElementById('profileForm').addEventListener('submit', (event) => {
    event.preventDefault();
    showToast('Perfil profissional atualizado.');
  });

  document.getElementById('profileEditForm').addEventListener('submit', saveBabaProfile);

  document.getElementById('messageForm').addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage(event.currentTarget);
  });

  const pdfInput = document.getElementById('pdfUpload');
  if (pdfInput) {
    pdfInput.addEventListener('change', () => {
      const file = pdfInput.files[0];
      const fileName = document.getElementById('fileName');
      const fileStatus = document.getElementById('fileStatus');
      if (file) {
        fileName.innerHTML = `${file.name}<br><small>Documento selecionado</small>`;
        fileStatus.textContent = 'Documento pronto para análise';
        fileStatus.style.color = '#a3721b';
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  bindActions();
  loadProfile();
});
