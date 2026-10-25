const screenNames = {
  inicio: 'INÍCIO',
  perfil: 'PERFIL',
  entrevistas: 'ENTREVISTAS',
  contratos: 'CONTRATOS',
  conversas: 'CONVERSAS',
  pagamentos: 'PAGAMENTOS',
  configuracoes: 'CONFIGURAÇÕES'
};

let currentProfile = null;
let currentRateValue = null;
let currentRateNegotiable = false;
let nextRateChangeAt = null;
let profilePhotoUrl = null;
let certificatePreviewUrl = null;
let diplomaPreviewUrl = null;
let conversations = [];
let activeConversationId = null;
let conversationsPoll = null;
let scheduleLoadVersion = 0;

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

function redirecionarContaRestrita(status, desativadaAte, desativadaDias) {
  const params = new URLSearchParams({ status });
  if (desativadaAte) params.set('ate', desativadaAte);
  if (desativadaDias) params.set('dias', desativadaDias);
  window.location.replace(`acesso-conta.html?${params}`);
}

async function loadProfile() {
  const token = BabysiteSession.get('baba');
  if (!token) {
    window.location.replace('../home/home.html');
    return;
  }
  try {
    const response = await fetch('/api/sessao', { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401) {
      BabysiteSession.clear('baba', token);
      window.location.replace('../home/home.html');
      return;
    }
    if (response.status === 423) {
      const restriction = await response.json();
      redirecionarContaRestrita(
        restriction.status_conta,
        restriction.desativada_ate,
        restriction.desativada_dias
      );
      return;
    }
    if (!response.ok) throw new Error('Não foi possível carregar seu perfil.');
    const profile = await response.json();
    if (profile.tipo_usuario !== 'baba') {
      window.location.replace('../home/home.html');
      return;
    }
    BabysiteSession.remember('baba', token);
    currentProfile = profile;
    document.getElementById('currentUserNameSidebar').textContent = profile.nome;
    document.getElementById('currentUserEmailSidebar').textContent = profile.email_1;
    document.getElementById('currentUserAvatar').textContent = profile.nome.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    document.getElementById('profileName').value = profile.nome;
    document.getElementById('profileDisplayName').textContent = profile.nome;
    document.getElementById('profileInitials').textContent = profile.nome.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    renderCurrentRate(profile.tarifa_hora, profile.tarifa_negociavel);
    await Promise.all([loadBabaProfile(), loadAvailability()]);
    const status = document.getElementById('profileStatus');
    const heroStatus = document.getElementById('profileHeroStatus');
    const active = profile.status_cadastro === 'Ativa';
    const diplomaAprovado = profile.diploma_status === 'Aprovada';
    const avisoDiploma = document.getElementById('diplomaAccessNotice');
    const botaoDiploma = document.getElementById('reviewDiplomaProfile');
    avisoDiploma.hidden = diplomaAprovado;
    botaoDiploma.hidden = diplomaAprovado;
    if (!diplomaAprovado) {
      avisoDiploma.textContent = profile.diploma_status === 'Recusada'
        ? 'O diploma foi recusado. Envie um novo documento em Meu perfil; entrevistas e contratos ficam bloqueados até a aprovação.'
        : 'Você já pode usar sua área profissional. As solicitações de entrevistas e contratos serão liberadas após a aprovação do diploma.';
    }
    const statusTexto = !active
      ? '◉ Perfil em análise'
      : diplomaAprovado
        ? '✓ Perfil ativo'
        : profile.diploma_status === 'Recusada'
          ? '◉ Diploma recusado'
          : '◉ Diploma em análise';
    status.textContent = statusTexto;
    status.classList.toggle('good', active && diplomaAprovado);
    status.classList.toggle('pending', !active || !diplomaAprovado);
    heroStatus.textContent = statusTexto;
    heroStatus.classList.toggle('good', active && diplomaAprovado);
    heroStatus.classList.toggle('pending', !active || !diplomaAprovado);
    await loadSchedule();
    await loadConversations();
    conversationsPoll = window.setInterval(() => {
      loadSchedule();
      loadConversations();
    }, 5000);
    const parametros = new URLSearchParams(window.location.search);
    const avisosCadastro = [];
    if (parametros.has('foto_pendente')) avisosCadastro.push('Não foi possível enviar a foto; você pode adicioná-la em Meu perfil.');
    if (parametros.has('certidao_pendente')) avisosCadastro.push('Não foi possível enviar a certidão; você pode enviá-la em Meu perfil.');
    if (parametros.has('diploma_pendente')) avisosCadastro.push('Seu diploma está em análise; solicitações de entrevistas e contratos serão liberadas após a aprovação.');
    if (avisosCadastro.length) {
      showToast(`Cadastro concluído. ${avisosCadastro.join(' ')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  } catch (error) {
    showToast(error.message);
  }
}

async function requestApi(url, options = {}) {
  const token = BabysiteSession.get('baba');
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  document.getElementById('chooseDiploma').addEventListener('click', () => {
    document.getElementById('diplomaInput').click();
  });
  document.getElementById('diplomaInput').addEventListener('change', (event) => {
    document.getElementById('diplomaFileName').textContent = event.currentTarget.files[0]?.name || 'Nenhum arquivo selecionado';
  });
  document.getElementById('diplomaForm').addEventListener('submit', uploadDiploma);
  document.getElementById('viewDiploma').addEventListener('click', visualizarDiploma);
  document.querySelector('[data-close-diploma-preview]').addEventListener('click', () => {
    document.getElementById('diplomaPreviewDialog').close();
  });
  document.getElementById('diplomaPreviewDialog').addEventListener('close', () => {
    document.getElementById('diplomaFrame').src = 'about:blank';
    if (diplomaPreviewUrl) URL.revokeObjectURL(diplomaPreviewUrl);
    diplomaPreviewUrl = null;
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    if (response.status === 423 && result.status_conta) {
      redirecionarContaRestrita(result.status_conta, result.desativada_ate, result.desativada_dias);
    }
    const error = new Error(result.erro || 'Não foi possível concluir a solicitação.');
    error.status = response.status;
    error.result = result;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

function renderCurrentRate(tarifa, negociavel = false) {
  const tarifaValida = tarifa !== null && tarifa !== undefined && Number.isFinite(Number(tarifa));
  currentRateNegotiable = Boolean(negociavel);
  currentRateValue = tarifaValida ? Number(tarifa) : null;
  const valorFormatado = currentRateNegotiable
    ? 'Negociável'
    : tarifaValida
    ? `R$ ${Number(tarifa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : '--';
  document.getElementById('currentRate').textContent = valorFormatado;
  document.getElementById('profileCurrentRate').textContent = valorFormatado;
  document.getElementById('currentRateStatus').textContent = tarifaValida
    ? 'Valor por hora'
    : currentRateNegotiable
      ? 'Valor combinado com a família'
    : 'Tarifa não cadastrada';
}

function formatDate(date) {
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.valueOf()) ? '' : parsedDate.toLocaleDateString('pt-BR');
}

function formatDateTime(date) {
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.valueOf())
    ? ''
    : parsedDate.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function rateChangeLocked() {
  return Boolean(nextRateChangeAt && new Date(nextRateChangeAt).valueOf() > Date.now());
}

function showRateCooldown(date) {
  if (date) nextRateChangeAt = date;
  const formattedDate = nextRateChangeAt ? formatDate(nextRateChangeAt) : '';
  document.getElementById('rateCooldownMessage').textContent = formattedDate
    ? `Você só pode mudar essa informação a cada 1 segundo. Tente novamente a partir de ${formattedDate}.`
    : 'Você só pode mudar essa informação a cada 1 segundo.';
  document.getElementById('rateCooldownDialog').showModal();
}

async function loadProfilePhoto(disponivel) {
  const image = document.getElementById('profilePhoto');
  const initials = document.getElementById('profileInitials');
  if (profilePhotoUrl) URL.revokeObjectURL(profilePhotoUrl);
  profilePhotoUrl = null;
  image.hidden = true;
  initials.hidden = false;
  if (!disponivel) return;

  try {
    const token = BabysiteSession.get('baba');
    const response = await fetch(`/api/babas/${encodeURIComponent(currentProfile.codigo_perfil)}/foto`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Não foi possível carregar a foto de perfil.');
    profilePhotoUrl = URL.createObjectURL(await response.blob());
    image.src = profilePhotoUrl;
    image.hidden = false;
    initials.hidden = true;
  } catch (error) {
    showToast(error.message);
  }
}

function renderCertificate(certidao, statusAtual, proximaAtualizacao) {
  const status = document.getElementById('certificateStatus');
  const info = document.getElementById('certificateInfo');
  const viewButton = document.getElementById('viewCertificate');
  const removeButton = document.getElementById('removeCertificate');
  const chooseButton = document.getElementById('chooseCertificate');
  const uploadButton = document.getElementById('uploadCertificate');
  const fileInput = document.getElementById('certificateInput');
  const cooldown = proximaAtualizacao || null;
  const locked = Boolean(cooldown && new Date(cooldown).valueOf() > Date.now());
  const statusDocumento = certidao?.status || (statusAtual === 'Removida' ? 'Removida' : null);

  status.textContent = statusDocumento || (certidao ? 'Pendente' : 'Não enviada');
  status.classList.toggle('approved', statusDocumento === 'Aprovada');
  status.classList.toggle('rejected', statusDocumento === 'Recusada');
  status.classList.toggle('pending', !statusDocumento || ['Pendente', 'Removida'].includes(statusDocumento));
  info.hidden = !certidao;
  viewButton.hidden = !certidao;
  removeButton.hidden = !certidao;
  if (certidao) {
    document.getElementById('certificateName').textContent = certidao.nome;
    document.getElementById('certificateUpdatedAt').textContent = `Enviada em ${formatDateTime(certidao.atualizada_em)}`;
  }
  document.getElementById('certificateDescription').textContent = statusDocumento === 'Aprovada'
    ? 'Sua certidão foi aprovada pela administração.'
    : statusDocumento === 'Recusada'
      ? 'A administração recusou sua certidão. Você poderá enviar outra após 1 segundo.'
      : statusDocumento === 'Pendente'
        ? 'Sua certidão foi enviada e aguarda análise da administração.'
        : 'Envie sua certidão em PDF para análise da administração.';
  chooseButton.disabled = locked;
  uploadButton.disabled = locked;
  fileInput.disabled = locked;
  removeButton.disabled = locked;
  document.getElementById('certificateCooldownStatus').textContent = locked
    ? `Você poderá enviar ou remover a certidão a partir de ${formatDateTime(cooldown)}.`
    : 'Envio, substituição e remoção podem ser feitos novamente após 1 segundo.';
}

function renderDiploma(diploma, statusAtual) {
  const status = diploma?.status || statusAtual || 'Pendente';
  const statusElement = document.getElementById('diplomaStatus');
  statusElement.textContent = status;
  statusElement.classList.toggle('approved', status === 'Aprovada');
  statusElement.classList.toggle('rejected', status === 'Recusada');
  statusElement.classList.toggle('pending', status === 'Pendente');
  document.getElementById('diplomaInfo').hidden = !diploma;
  document.getElementById('viewDiploma').hidden = !diploma;
  document.getElementById('diplomaForm').hidden = Boolean(diploma) && status !== 'Recusada';
  if (diploma) {
    document.getElementById('diplomaName').textContent = diploma.nome;
    document.getElementById('diplomaUpdatedAt').textContent = `Enviado em ${formatDateTime(diploma.atualizado_em)}`;
  }
  document.getElementById('diplomaDescription').textContent = status === 'Aprovada'
    ? 'Seu diploma foi aprovado. Seu perfil pode receber solicitações de entrevistas e contratos.'
    : status === 'Recusada'
      ? 'A administração recusou o diploma. Envie um novo PDF para análise; solicitações continuam bloqueadas até a aprovação.'
      : 'Seu diploma está em análise. Você pode acessar sua área, mas ainda não recebe solicitações de entrevistas ou contratos.';
}

async function loadBabaProfile() {
  try {
    const profile = await requestApi(`/api/babas/${encodeURIComponent(currentProfile.codigo_perfil)}/perfil`);
    document.getElementById('profileStateInput').value = profile.estado || '';
    document.getElementById('profileCityInput').value = profile.municipio || '';
    document.querySelectorAll('[name="paymentMethod"]').forEach((field) => {
      field.checked = profile.formas_pagamento.includes(field.value);
    });
    const location = [profile.municipio, profile.estado].filter(Boolean).join(' · ');
    document.getElementById('profileLocationSummary').textContent = location || 'Localização não informada';
    nextRateChangeAt = profile.tarifa_proxima_alteracao_em || null;
    document.getElementById('rateChangeAvailability').textContent = nextRateChangeAt && rateChangeLocked()
      ? `Disponível novamente em ${formatDate(nextRateChangeAt)}`
      : 'Você pode alterar a tarifa';
    renderCurrentRate(profile.tarifa_hora, profile.tarifa_negociavel);
    renderCertificate(profile.certidao, profile.certidao_status, profile.certidao_proxima_atualizacao_em);
    renderDiploma(profile.diploma, profile.diploma_status);
    await loadProfilePhoto(profile.foto_disponivel);
  } catch (error) {
    showToast(error.message);
  }
}

async function uploadDiploma(event) {
  event.preventDefault();
  const input = document.getElementById('diplomaInput');
  const arquivo = input.files[0];
  if (!arquivo) {
    showToast('Escolha o diploma em PDF para enviar.');
    return;
  }
  if ((arquivo.type && arquivo.type !== 'application/pdf') || arquivo.size > 10 * 1024 * 1024) {
    showToast(arquivo.size > 10 * 1024 * 1024
      ? 'O diploma precisa ter no máximo 10 MB.'
      : 'Envie o diploma no formato PDF.');
    return;
  }
  const submitButton = document.getElementById('uploadDiploma');
  const dados = new FormData();
  dados.append('diploma', arquivo);
  submitButton.disabled = true;
  try {
    const resultado = await requestApi(`/api/babas/${encodeURIComponent(currentProfile.codigo_perfil)}/diploma`, {
      method: 'POST',
      body: dados
    });
    document.getElementById('diplomaFileName').textContent = 'Nenhum arquivo selecionado';
    showToast(resultado.mensagem);
    await loadBabaProfile();
  } catch (error) {
    showToast(error.message);
  } finally {
    input.value = '';
    submitButton.disabled = false;
  }
}

async function visualizarDiploma() {
  try {
    const token = BabysiteSession.get('baba');
    const response = await fetch(`/api/babas/${encodeURIComponent(currentProfile.codigo_perfil)}/diploma`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const resultado = await response.json().catch(() => ({}));
      throw new Error(resultado.erro || 'Não foi possível abrir o diploma.');
    }
    if (diplomaPreviewUrl) URL.revokeObjectURL(diplomaPreviewUrl);
    diplomaPreviewUrl = URL.createObjectURL(await response.blob());
    document.getElementById('diplomaFrame').src = diplomaPreviewUrl;
    document.getElementById('diplomaPreviewDialog').showModal();
  } catch (error) {
    showToast(error.message);
  }
}

function setAvailabilityDay(dayField, enabled) {
  const row = dayField.closest('.availability-row');
  row.querySelectorAll('[data-start-time], [data-end-time]').forEach((field) => {
    field.disabled = !enabled;
    field.required = enabled;
  });
  if (!enabled) row.querySelectorAll('[data-start-time], [data-end-time]').forEach((field) => { field.value = ''; });
}

async function loadAvailability() {
  try {
    const horarios = await requestApi(`/api/babas/${encodeURIComponent(currentProfile.codigo_perfil)}/disponibilidade`);
    horarios.forEach((horario) => {
      const dayField = document.querySelector(`[data-availability-day="${horario.dia_semana}"]`);
      if (!dayField) return;
      dayField.checked = true;
      setAvailabilityDay(dayField, true);
      const row = dayField.closest('.availability-row');
      row.querySelector('[data-start-time]').value = horario.hora_inicio;
      row.querySelector('[data-end-time]').value = horario.hora_fim;
    });
  } catch (error) {
    document.getElementById('profileAvailabilityError').textContent = error.message;
  }
}

async function saveAvailability(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorMessage = document.getElementById('profileAvailabilityError');
  const submitButton = form.querySelector('[type="submit"]');
  errorMessage.textContent = '';
  const disponibilidade = [...form.querySelectorAll('[data-availability-day]:checked')].map((dayField) => {
    const row = dayField.closest('.availability-row');
    return {
      dia_semana: dayField.dataset.availabilityDay,
      hora_inicio: row.querySelector('[data-start-time]').value,
      hora_fim: row.querySelector('[data-end-time]').value
    };
  });
  if (!disponibilidade.length) {
    errorMessage.textContent = 'Selecione pelo menos um dia disponível.';
    return;
  }
  if (disponibilidade.some(({ hora_inicio, hora_fim }) => !hora_inicio || !hora_fim || hora_inicio >= hora_fim)) {
    errorMessage.textContent = 'Informe horários válidos e um horário de término posterior ao início.';
    return;
  }

  submitButton.disabled = true;
  try {
    const resultado = await requestApi(`/api/babas/${encodeURIComponent(currentProfile.codigo_perfil)}/disponibilidade`, {
      method: 'PUT',
      body: JSON.stringify({ disponibilidade })
    });
    showToast(resultado.mensagem);
  } catch (error) {
    errorMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
}

async function saveBabaProfile(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    const result = await requestApi(`/api/babas/${encodeURIComponent(currentProfile.codigo_perfil)}/perfil`, {
      method: 'PUT',
      body: JSON.stringify({
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

async function savePaymentMethods(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formasPagamento = [...form.querySelectorAll('[name="paymentMethod"]:checked')].map((field) => field.value);
  const errorMessage = document.getElementById('paymentMethodsError');
  if (!formasPagamento.length) {
    errorMessage.textContent = 'Selecione pelo menos uma forma de pagamento.';
    return;
  }
  errorMessage.textContent = '';
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    const result = await requestApi(`/api/babas/${encodeURIComponent(currentProfile.codigo_perfil)}/perfil`, {
      method: 'PUT',
      body: JSON.stringify({ formas_pagamento: formasPagamento })
    });
    showToast(result.mensagem);
    await loadBabaProfile();
  } catch (error) {
    errorMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
}

function openRateEditor() {
  if (rateChangeLocked()) {
    showRateCooldown();
    return;
  }
  document.getElementById('rateInput').value = currentRateValue ?? '';
  document.getElementById('rateNegotiable').checked = currentRateNegotiable;
  document.getElementById('rateInput').disabled = currentRateNegotiable;
  document.getElementById('rateInput').required = !currentRateNegotiable;
  document.getElementById('rateChangeDialog').showModal();
}

async function saveRateChange(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  const negociavel = document.getElementById('rateNegotiable').checked;
  try {
    await requestApi(`/api/babas/${encodeURIComponent(currentProfile.codigo_perfil)}/perfil`, {
      method: 'PUT',
      body: JSON.stringify({
        tarifa_hora: negociavel ? null : Number(document.getElementById('rateInput').value),
        tarifa_negociavel: negociavel
      })
    });
    document.getElementById('rateChangeDialog').close();
    showToast('Tarifa atualizada. Você poderá alterá-la novamente após 1 segundo.');
    await loadBabaProfile();
  } catch (error) {
    if (error.status === 409) {
      document.getElementById('rateChangeDialog').close();
      showRateCooldown(error.result.proxima_alteracao_tarifa);
    } else {
      showToast(error.message);
    }
  } finally {
    submitButton.disabled = false;
  }
}

async function uploadProfilePhoto() {
  const input = document.getElementById('profilePhotoInput');
  const arquivo = input.files[0];
  if (!arquivo) return;
  if (arquivo.size > 5 * 1024 * 1024) {
    showToast('A foto precisa ter no máximo 5 MB.');
    input.value = '';
    return;
  }
  const dados = new FormData();
  dados.append('foto', arquivo);
  try {
    const resultado = await requestApi(`/api/babas/${encodeURIComponent(currentProfile.codigo_perfil)}/foto`, {
      method: 'POST',
      body: dados
    });
    showToast(resultado.mensagem);
    await loadBabaProfile();
  } catch (error) {
    showToast(error.message);
  } finally {
    input.value = '';
  }
}

async function uploadCertificate(event) {
  event.preventDefault();
  const input = document.getElementById('certificateInput');
  const arquivo = input.files[0];
  if (!arquivo) {
    showToast('Escolha um arquivo PDF para enviar.');
    return;
  }
  if (arquivo.size > 10 * 1024 * 1024) {
    showToast('A certidão precisa ter no máximo 10 MB.');
    return;
  }
  const submitButton = document.getElementById('uploadCertificate');
  const dados = new FormData();
  dados.append('certidao', arquivo);
  submitButton.disabled = true;
  try {
    const resultado = await requestApi(`/api/babas/${encodeURIComponent(currentProfile.codigo_perfil)}/certidao`, {
      method: 'POST',
      body: dados
    });
    document.getElementById('certificateFileName').textContent = 'Nenhum arquivo selecionado';
    showToast(resultado.mensagem);
    await loadBabaProfile();
  } catch (error) {
    if (error.status === 409) {
      await loadBabaProfile();
      showToast(error.message);
    } else {
      showToast(error.message);
    }
  } finally {
    input.value = '';
    submitButton.disabled = false;
  }
}

async function removerCertidao() {
  if (!window.confirm('Remover a certidão atual? Você poderá atualizá-la novamente após 1 segundo.')) return;
  const button = document.getElementById('removeCertificate');
  button.disabled = true;
  try {
    const resultado = await requestApi(`/api/babas/${encodeURIComponent(currentProfile.codigo_perfil)}/certidao`, {
      method: 'DELETE'
    });
    showToast(resultado.mensagem);
    await loadBabaProfile();
  } catch (error) {
    if (error.status === 409) await loadBabaProfile();
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
}

async function visualizarCertidao() {
  try {
    const token = BabysiteSession.get('baba');
    const response = await fetch(`/api/babas/${encodeURIComponent(currentProfile.codigo_perfil)}/certidao`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const resultado = await response.json().catch(() => ({}));
      throw new Error(resultado.erro || 'Não foi possível abrir a certidão.');
    }
    if (certificatePreviewUrl) URL.revokeObjectURL(certificatePreviewUrl);
    certificatePreviewUrl = URL.createObjectURL(await response.blob());
    document.getElementById('certificateFrame').src = certificatePreviewUrl;
    document.getElementById('certificatePreviewDialog').showModal();
  } catch (error) {
    showToast(error.message);
  }
}

function fecharPreviaCertidao() {
  const dialog = document.getElementById('certificatePreviewDialog');
  if (dialog.open) dialog.close();
  document.getElementById('certificateFrame').src = 'about:blank';
  if (certificatePreviewUrl) URL.revokeObjectURL(certificatePreviewUrl);
  certificatePreviewUrl = null;
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

function renderRequestCards(requests, tipo) {
  const title = tipo === 'entrevista' ? 'Entrevista' : 'Contrato';
  if (!requests.length) {
    return `<p class="muted">Nenhuma solicitação de ${tipo} pendente.</p>`;
  }
  return requests.map((request) => {
    const id = escapeHTML(request.solicitacao_id);
    const nomeResponsavel = request.nome_pais || 'Responsável';
    const horarios = getContractHours(request);
    const details = tipo === 'entrevista'
      ? `${request.data_entrevista ? displayDate(request.data_entrevista) : 'Data não informada'} às ${escapeHTML(request.hora_entrevista || 'horário não informado')} · ${escapeHTML(request.formato || 'formato não informado')}`
      : `${request.data_inicio ? displayDate(request.data_inicio) : 'Início não informado'} a ${request.data_fim ? displayDate(request.data_fim) : 'fim não informado'} · ${horarios.map((item) => `${escapeHTML(item.dia_semana)} ${escapeHTML(item.hora_inicio)}–${escapeHTML(item.hora_fim)}`).join(', ') || 'Horários não informados'} · ${request.tarifa_hora == null ? 'Tarifa não informada' : `${formatCurrency(request.tarifa_hora)}/hora`}`;
    return `<article class="request-item">
      <span class="avatar coral">${escapeHTML(nomeResponsavel.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase())}</span>
      <div><strong>${title} · ${escapeHTML(nomeResponsavel)}</strong><small>${escapeHTML(details)}</small>${request.mensagem ? `<span>${escapeHTML(request.mensagem)}</span>` : ''}</div>
      <div class="request-actions">
        <button class="approve-button" data-request-action="aceitar" data-request-type="${tipo}" data-request-id="${id}">Aceitar</button>
        <button class="decline-button" data-request-action="recusar" data-request-type="${tipo}" data-request-id="${id}">Recusar</button>
      </div>
    </article>`;
  }).join('');
}

function renderRequests(requests) {
  const entrevistasPendentes = requests.filter((request) => request.tipo === 'entrevista');
  const contratosPendentes = requests.filter((request) => request.tipo === 'contrato');
  const interviewCount = entrevistasPendentes.length;
  const contractCount = contratosPendentes.length;
  const totalCount = requests.length;
  const entrevistasHtml = renderRequestCards(entrevistasPendentes, 'entrevista');
  const contratosHtml = renderRequestCards(contratosPendentes, 'contrato');
  const conversasHtml = requests.length
    ? requests.map((request) => renderRequestCards([request], request.tipo)).join('')
    : '<p class="muted">Nenhuma solicitação pendente.</p>';
  document.getElementById('pendingRequestCount').textContent = requests.length;
  document.getElementById('newInterviewCount').textContent = interviewCount;
  document.getElementById('newContractCount').textContent = contractCount;
  document.getElementById('pendingInterviewMetric').textContent = interviewCount;
  document.getElementById('pendingContractMetric').textContent = contractCount;
  document.getElementById('pendingInterviewLabel').textContent = interviewCount === 1 ? 'entrevista' : 'entrevistas';
  document.getElementById('pendingContractLabel').textContent = contractCount === 1 ? 'contrato' : 'contratos';
  document.getElementById('interviewRequestList').innerHTML = entrevistasHtml;
  document.getElementById('contractRequestList').innerHTML = contratosHtml;
  document.getElementById('conversationRequestCount').textContent = totalCount;
  document.getElementById('conversationRequestNavCount').textContent = totalCount;
  document.getElementById('conversationRequestList').innerHTML = conversasHtml;
  document.getElementById('requestPreview').innerHTML = requests.length
    ? `<p class="muted">${interviewCount} entrevista(s) e ${contractCount} contrato(s) aguardando resposta.</p>`
    : '<p class="muted">Nenhuma solicitação pendente.</p>';
}

function renderInterviews(interviews) {
  const target = document.getElementById('interviewList');
  target.innerHTML = interviews.length ? interviews.map((item) => `
    <article class="appointment"><div><strong>${escapeHTML(item.nome_pais)}</strong>
    <small>${displayDate(item.data_entrevista)} às ${escapeHTML(item.hora_entrevista)} · ${escapeHTML(item.formato)}</small>
    <small>Status: ${escapeHTML(item.status)}</small>
    ${item.avaliacao_id ? `<small>Sua avaliação: ${item.nota}/5${item.motivos?.length ? ` · ${item.motivos.map(escapeHTML).join(', ')}` : ''}${item.comentario ? ` · ${escapeHTML(item.comentario)}` : ''}</small>` : ''}
    </div>${item.status === 'Concluída' && !item.avaliacao_id
      ? `<button class="primary-button" type="button" data-review-interview="${escapeHTML(item.entrevista_id)}">Avaliar</button>` : ''}</article>`).join('')
    : '<p class="muted">Nenhuma entrevista aceita registrada.</p>';
}

function renderContracts(contracts) {
  const target = document.getElementById('contractList');
  target.innerHTML = contracts.length ? contracts.map((item) => `
    <article class="appointment"><div><strong>${escapeHTML(item.nome_pais)} · ${displayDate(item.data_inicio)} a ${item.data_fim ? displayDate(item.data_fim) : 'fim não informado'}</strong>
    <small>${getContractHours(item).map((horario) => `${escapeHTML(horario.dia_semana)} ${escapeHTML(horario.hora_inicio)}–${escapeHTML(horario.hora_fim)}`).join(' · ') || 'Horários não informados'}</small>
    ${item.valor_total === null ? '<small>Custo indisponível: tarifa não informada.</small>' : `<small>Valor previsto: ${formatCurrency(item.valor_total)} · ${item.total_horas} horas de serviço</small>`}
    <small>Status: ${escapeHTML(item.status)}</small>
    ${item.avaliacao_id ? `<small>Avaliação recebida: ${item.nota}/5${item.motivos?.length ? ` · Motivos: ${item.motivos.map(escapeHTML).join(', ')}` : ''}${item.comentario ? ` · ${escapeHTML(item.comentario)}` : ''}</small>` : ''}
    </div>
    ${item.status === 'Ativo'
      ? `<button class="primary-button" type="button" data-finish-contract="${escapeHTML(item.contrato_id)}">Finalizar serviço</button>` : ''}</article>`).join('')
    : '<p class="muted">Nenhum contrato aceito registrado.</p>';
}

function renderPayments(payments) {
  const target = document.getElementById('paymentList');
  const summary = document.getElementById('paymentSummary');
  const pagos = payments.filter((payment) => payment.pagamento_status === 'Pago');
  const pendentes = payments.filter((payment) => payment.pagamento_status === 'Pendente');
  const valorPago = pagos.reduce((total, payment) => total + (Number(payment.valor_total) || 0), 0);
  const valorPendente = pendentes.reduce((total, payment) => total + (Number(payment.valor_total) || 0), 0);
  summary.innerHTML = `
    <article class="payment-summary-card"><span>Total recebido</span><strong>${formatCurrency(valorPago)}</strong><small>${pagos.length} pagamento(s) confirmado(s)</small></article>
    <article class="payment-summary-card"><span>A receber</span><strong>${formatCurrency(valorPendente)}</strong><small>${pendentes.length} pagamento(s) pendente(s)</small></article>
    <article class="payment-summary-card"><span>Contratos</span><strong>${payments.length}</strong><small>Valores calculados pelo período e horários</small></article>`;
  target.innerHTML = payments.length ? payments.map((payment) => {
    const horarios = getContractHours(payment);
    const descricaoHorarios = horarios.map((item) => `${escapeHTML(item.dia_semana)} ${escapeHTML(item.hora_inicio)}–${escapeHTML(item.hora_fim)}`).join(' · ');
    const custo = payment.valor_total === null
      ? '<p>Não foi possível calcular: tarifa ou horários indisponíveis.</p>'
      : `<p>${payment.quantidade_servicos} diária(s) · ${payment.total_horas} horas × ${formatCurrency(payment.tarifa_hora)}/hora</p>`;
    const status = payment.pagamento_status === 'Pago' ? 'Pago' : 'Pendente';
    return `<article class="payment-card">
      <div class="payment-card-details">
        <strong>${escapeHTML(payment.nome_pais)} · ${displayDate(payment.data_inicio)} a ${displayDate(payment.data_fim)}</strong>
        <small>${descricaoHorarios || 'Horários não informados'}</small>
        ${custo}
        ${payment.pago_em ? `<small>Pagamento registrado em ${new Date(payment.pago_em).toLocaleDateString('pt-BR')}</small>` : ''}
      </div>
      <div class="payment-card-total">
        <span class="payment-status${status === 'Pago' ? ' paid' : ''}">${status}</span>
        <strong>${payment.valor_total === null ? '—' : formatCurrency(payment.valor_total)}</strong>
        ${payment.denuncia_enviada
          ? '<small class="payment-report-status">Aviso enviado ao responsável</small>'
          : payment.pagamento_status === 'Pendente' && payment.status_contrato === 'Concluído'
            ? `<button class="secondary-button" type="button" data-report-payment="${escapeHTML(payment.contrato_id)}">Avisar responsável</button>`
            : ''}
      </div>
    </article>`;
  }).join('') : '<p class="muted">Nenhum contrato com pagamento registrado.</p>';
}

function dataDaAvaliacao(contrato) {
  const data = contrato.avaliado_em || contrato.criado_em;
  if (!data) return 0;
  const normalizada = data.includes('T') ? data : `${data.replace(' ', 'T')}Z`;
  return Date.parse(normalizada) || 0;
}

function renderReviewsSummary(contracts) {
  const avaliados = contracts.filter((contrato) => contrato.avaliacao_id && Number.isFinite(Number(contrato.nota)));
  const media = avaliados.length
    ? avaliados.reduce((total, contrato) => total + Number(contrato.nota), 0) / avaliados.length
    : null;
  document.getElementById('averageRating').textContent = media === null
    ? '--'
    : media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  document.getElementById('averageRatingStars').textContent = media === null ? '' : '★'.repeat(Math.round(media));
  document.getElementById('ratingCountLabel').textContent = avaliados.length
    ? `${avaliados.length} ${avaliados.length === 1 ? 'avaliação recebida' : 'avaliações recebidas'}`
    : 'Nenhuma avaliação registrada';

  const recentes = avaliados
    .filter((contrato) => typeof contrato.comentario === 'string' && contrato.comentario.trim())
    .sort((first, second) => dataDaAvaliacao(second) - dataDaAvaliacao(first))
    .slice(0, 5);
  const lista = document.getElementById('recentCommentsList');
  lista.innerHTML = recentes.length ? recentes.map((contrato) => {
    const nota = Number(contrato.nota);
    const data = contrato.avaliado_em
      ? formatDateTime(contrato.avaliado_em.includes('T') ? contrato.avaliado_em : `${contrato.avaliado_em.replace(' ', 'T')}Z`)
      : 'Data não informada';
    return `<article class="review-item">
      <div class="review-item-heading"><strong>${escapeHTML(contrato.nome_pais)}</strong><time>${escapeHTML(data)}</time></div>
      <div class="review-rating" aria-label="${nota} de 5 estrelas">${'★'.repeat(nota)}<span class="review-rating-value">${nota}/5</span></div>
      <p>${escapeHTML(contrato.comentario.trim())}</p>
    </article>`;
  }).join('') : '<p class="muted">Nenhum comentário recebido ainda.</p>';
}

function openInterviewReviewDialog(entrevistaId) {
  const form = document.getElementById('interviewReviewForm');
  form.dataset.entrevistaId = entrevistaId;
  document.getElementById('interviewReviewDialog').showModal();
  form.elements.nota.focus();
}

function closeInterviewReviewDialog() {
  document.getElementById('interviewReviewDialog').close();
  document.getElementById('interviewReviewForm').reset();
  delete document.getElementById('interviewReviewForm').dataset.entrevistaId;
  updateInterviewReviewReasons();
}

function updateInterviewReviewReasons() {
  const form = document.getElementById('interviewReviewForm');
  const nota = Number(form.elements.nota.value);
  const reasons = document.getElementById('interviewReviewReasons');
  const motivoInputs = [...form.querySelectorAll('[name="motivos"]')];
  const obrigatorios = nota >= 1 && nota <= 3;
  reasons.hidden = !obrigatorios;
  motivoInputs.forEach((input) => {
    if (!obrigatorios) input.checked = false;
    input.required = false;
    input.setCustomValidity('');
  });
  if (obrigatorios) {
    motivoInputs[0].required = true;
    document.getElementById('interviewReviewReasonsHint').textContent =
      'Os motivos e qualquer comentário serão encaminhados anonimamente à administração.';
  }
}

async function submitInterviewReview(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const nota = Number(formData.get('nota'));
  const motivos = formData.getAll('motivos');
  if (nota <= 3 && motivos.length === 0) {
    form.querySelector('#interviewReviewReasons input').setCustomValidity('Selecione ao menos um motivo.');
    form.querySelector('#interviewReviewReasons input').reportValidity();
    return;
  }
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    const resultado = await requestApi(`/api/entrevistas/${form.dataset.entrevistaId}/avaliacao`, {
      method: 'POST',
      body: JSON.stringify({
        nota,
        comentario: formData.get('comentario'),
        motivos
      })
    });
    closeInterviewReviewDialog();
    showToast(resultado.mensagem);
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
    renderRequests(requests);
    renderInterviews(interviews);
    renderContracts(contracts);
    renderPayments(payments);
    renderReviewsSummary(contracts);
    document.getElementById('interviewCount').textContent = interviews.length + requests.filter((request) => request.tipo === 'entrevista').length;
    document.getElementById('contractCount').textContent = contracts.length + requests.filter((request) => request.tipo === 'contrato').length;
    document.getElementById('paymentNavCount').textContent = payments.filter((payment) => payment.pagamento_status === 'Pago').length;
  } catch (error) {
    if (loadVersion === scheduleLoadVersion) showToast(error.message);
  }
}

async function logout() {
  const token = BabysiteSession.get('baba');
  if (token) await fetch('/api/sessao', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  BabysiteSession.clear('baba', token);
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

  document.querySelectorAll('[data-logout]').forEach((button) => {
    button.addEventListener('click', logout);
  });

  document.getElementById('paymentList').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-report-payment]');
    if (!button) return;
    if (!window.confirm('Enviar um aviso ao responsável informando que o pagamento deste contrato ainda está pendente?')) return;
    button.disabled = true;
    try {
      const resultado = await requestApi(`/api/contratos/${button.dataset.reportPayment}/denunciar-nao-pagamento`, { method: 'POST' });
      showToast(resultado.mensagem);
      await loadSchedule();
    } catch (error) {
      button.disabled = false;
      showToast(error.message);
    }
  });

  const processarSolicitacao = async (event) => {
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
  };
  document.getElementById('interviewRequestList').addEventListener('click', processarSolicitacao);
  document.getElementById('contractRequestList').addEventListener('click', processarSolicitacao);
  document.getElementById('conversationRequestList').addEventListener('click', processarSolicitacao);

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
  document.getElementById('interviewList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-review-interview]');
    if (button) openInterviewReviewDialog(button.dataset.reviewInterview);
  });
  document.querySelectorAll('[data-close-interview-review]').forEach((button) => {
    button.addEventListener('click', closeInterviewReviewDialog);
  });
  document.getElementById('interviewReviewDialog').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeInterviewReviewDialog();
  });
  document.getElementById('interviewReviewForm').addEventListener('submit', submitInterviewReview);
  document.querySelector('#interviewReviewForm [name="nota"]').addEventListener('change', updateInterviewReviewReasons);
  document.querySelectorAll('#interviewReviewReasons [name="motivos"]').forEach((motivo) => {
    motivo.addEventListener('change', () => {
      document.querySelector('#interviewReviewReasons input').setCustomValidity('');
    });
  });

  document.querySelector('.conversation-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-conversation-id]');
    if (button) selectConversation(button.dataset.conversationId);
  });

  document.getElementById('profileEditForm').addEventListener('submit', saveBabaProfile);
  document.getElementById('paymentMethodsForm').addEventListener('submit', savePaymentMethods);
  document.getElementById('profileAvailabilityForm').addEventListener('submit', saveAvailability);
  document.querySelectorAll('[data-availability-day]').forEach((dayField) => {
    dayField.addEventListener('change', () => setAvailabilityDay(dayField, dayField.checked));
  });
  document.getElementById('openRateEditor').addEventListener('click', openRateEditor);
  document.getElementById('rateChangeForm').addEventListener('submit', saveRateChange);
  document.getElementById('rateNegotiable').addEventListener('change', (event) => {
    const rateInput = document.getElementById('rateInput');
    rateInput.disabled = event.currentTarget.checked;
    rateInput.required = !event.currentTarget.checked;
  });
  document.querySelectorAll('[data-close-rate-dialog]').forEach((button) => {
    button.addEventListener('click', () => document.getElementById('rateChangeDialog').close());
  });
  document.querySelector('[data-close-rate-cooldown]').addEventListener('click', () => {
    document.getElementById('rateCooldownDialog').close();
  });
  document.getElementById('chooseProfilePhoto').addEventListener('click', () => {
    document.getElementById('profilePhotoInput').click();
  });
  document.getElementById('profilePhotoInput').addEventListener('change', uploadProfilePhoto);
  document.getElementById('chooseCertificate').addEventListener('click', () => {
    document.getElementById('certificateInput').click();
  });
  document.getElementById('certificateInput').addEventListener('change', (event) => {
    document.getElementById('certificateFileName').textContent = event.currentTarget.files[0]?.name || 'Nenhum arquivo selecionado';
  });
  document.getElementById('certificateForm').addEventListener('submit', uploadCertificate);
  document.getElementById('removeCertificate').addEventListener('click', removerCertidao);
  document.getElementById('viewCertificate').addEventListener('click', visualizarCertidao);
  document.querySelector('[data-close-certificate-preview]').addEventListener('click', fecharPreviaCertidao);
  document.getElementById('certificatePreviewDialog').addEventListener('close', () => {
    document.getElementById('certificateFrame').src = 'about:blank';
    if (certificatePreviewUrl) URL.revokeObjectURL(certificatePreviewUrl);
    certificatePreviewUrl = null;
  });

  document.getElementById('messageForm').addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage(event.currentTarget);
  });

}

document.addEventListener('DOMContentLoaded', () => {
  bindActions();
  loadProfile();
});
