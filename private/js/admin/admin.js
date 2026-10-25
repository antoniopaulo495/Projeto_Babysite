const token = sessionStorage.getItem('babysite-admin-token');
const screenNames = {
  inicio: 'INÍCIO',
  usuarios: 'USUÁRIOS',
  certidoes: 'DOCUMENTOS A VERIFICAR',
  denuncias: 'DENÚNCIAS',
  relatorios: 'RELATÓRIOS',
  configuracoes: 'CONFIGURAÇÕES'
};
let usuarios = [];
let certidoes = [];
let filtroPerfil = 'todos';
let documentoEmAnalise = null;
let urlPreviaCertidao = null;

function redirecionarLogin() {
  sessionStorage.removeItem('babysite-admin-token');
  window.location.replace('/html/admin/login-admin.html');
}

async function requisitar(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
    }
  });
  if (response.status === 401 || response.status === 403) {
    redirecionarLogin();
    throw new Error('Sessão inválida. Entre novamente.');
  }
  const resultado = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(resultado?.erro || 'Não foi possível concluir a solicitação.');
  return resultado;
}

function escapar(valor) {
  return String(valor).replace(/[&<>"']/g, (caractere) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[caractere]);
}

function mostrarErro(mensagem) {
  const elemento = document.getElementById('dataError');
  elemento.textContent = mensagem;
  elemento.hidden = false;
}

function showScreen(screen) {
  if (!screenNames[screen]) return;
  document.querySelectorAll('.side-link').forEach((item) => item.classList.toggle('active', item.dataset.screen === screen));
  document.querySelectorAll('[data-screen-content]').forEach((item) => item.classList.toggle('active-screen', item.dataset.screenContent === screen));
  document.getElementById('breadcrumbName').textContent = screenNames[screen];
  document.getElementById('screenTitle').textContent = screen === 'inicio'
    ? 'Visão geral'
    : screenNames[screen].charAt(0) + screenNames[screen].slice(1).toLowerCase();
  document.body.classList.remove('sidebar-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function mostrarResumo(resumo) {
  const campos = {
    metricUsers: resumo.usuarios,
    metricActive: resumo.babas_ativas,
    metricPending: resumo.cadastros_pendentes,
    metricParents: resumo.pais_ativos,
    reportUsers: resumo.usuarios,
    reportActive: resumo.babas_ativas,
    reportPending: resumo.cadastros_pendentes,
    navUsers: resumo.usuarios
  };
  Object.entries(campos).forEach(([id, valor]) => {
    document.getElementById(id).textContent = valor;
  });
  renderizarCadastrosRecentes(resumo.usuarios_recentes);
  renderizarDenunciasRecentes(resumo.denuncias_recentes);
}

function formatarData(data) {
  return data
    ? new Date(`${data.replace(' ', 'T')}Z`).toLocaleString('pt-BR')
    : 'Data não informada';
}

function renderizarCadastrosRecentes(cadastros) {
  const lista = document.getElementById('recentUsers');
  lista.innerHTML = cadastros.length ? cadastros.map((usuario) => `
    <article class="dashboard-user">
      <span class="dashboard-user-avatar ${usuario.perfil === 'Babá' ? 'nanny' : ''}">${escapar(usuario.nome.trim().charAt(0).toLocaleUpperCase('pt-BR'))}</span>
      <span class="dashboard-user-info"><strong>${escapar(usuario.nome)}</strong><small>${escapar(usuario.perfil)} · ${escapar(usuario.email)}</small></span>
      <span class="dashboard-user-meta"><span class="status ${usuario.status === 'Ativa' ? 'active' : usuario.status === 'Pendente' ? 'pending' : 'blocked'}">${escapar(usuario.status)}</span><time>${escapar(formatarData(usuario.criado_em))}</time></span>
    </article>`).join('') : '<p class="empty-state">Nenhum cadastro encontrado.</p>';
}

function renderizarDenunciasRecentes(denuncias) {
  const lista = document.getElementById('recentComplaints');
  lista.innerHTML = denuncias.length ? denuncias.map((denuncia) => `
    <article class="dashboard-complaint">
      <span class="dashboard-complaint-score">${escapar(denuncia.nota)}/5</span>
      <div><strong>Avaliação de ${escapar(denuncia.origem)}</strong><p>${denuncia.motivos.map(escapar).join(', ') || 'Sem motivo informado'}</p><small>${escapar(formatarData(denuncia.criada_em))}</small></div>
    </article>`).join('') : '<p class="empty-state">Nenhuma denúncia de avaliação recebida.</p>';
}

function renderizarUsuarios() {
  const termo = document.getElementById('userSearch').value.trim().toLocaleLowerCase('pt-BR');
  const filtrados = usuarios.filter((usuario) => {
    const perfilCorresponde = filtroPerfil === 'todos'
      || (filtroPerfil === 'baba' && usuario.perfil === 'Babá')
      || (filtroPerfil === 'pais' && usuario.perfil === 'Responsável');
    return perfilCorresponde && `${usuario.nome} ${usuario.email}`.toLocaleLowerCase('pt-BR').includes(termo);
  });
  const corpo = document.getElementById('userTable');
  if (!filtrados.length) {
    corpo.innerHTML = '<tr><td colspan="4">Nenhum usuário corresponde à busca.</td></tr>';
    return;
  }

  corpo.innerHTML = filtrados.map((usuario) => {
    const statusClass = usuario.status === 'Ativa' ? 'active'
      : usuario.status === 'Pendente' ? 'pending'
        : ['Bloqueada', 'Banida', 'Desativada'].includes(usuario.status) ? 'blocked' : 'active';
    const statusLabel = usuario.status === 'Desativada' && usuario.desativada_ate
      ? `${usuario.status} por ${usuario.desativada_dias || '?'} dia(s) · até ${new Date(usuario.desativada_ate).toLocaleString('pt-BR')}`
      : usuario.status;
    const temporaryDeactivation = `<div class="user-deactivation-actions">
      <select aria-label="Dias de desativação" data-deactivation-days="${escapar(usuario.codigo_perfil)}">
        ${[1, 2, 3, 4, 5, 6, 7].map((days) => `<option value="${days}">${days} dia(s)</option>`).join('')}
      </select>
      <button class="row-action danger" data-status="Desativada" data-days-field="${escapar(usuario.codigo_perfil)}" data-codigo="${escapar(usuario.codigo_perfil)}">Desativar</button>
    </div>`;
    const acao = usuario.perfil !== 'Babá' ? ''
      : usuario.status === 'Banida'
        ? `<button class="row-action" data-status="Ativa" data-restore-action="unban" data-codigo="${escapar(usuario.codigo_perfil)}">Desbanir e ativar</button>`
        : usuario.status === 'Bloqueada'
          ? `<button class="row-action" data-status="Ativa" data-codigo="${escapar(usuario.codigo_perfil)}">Reativar</button>`
          : usuario.status === 'Desativada'
            ? `<button class="row-action" data-status="Ativa" data-restore-action="reactivate" data-codigo="${escapar(usuario.codigo_perfil)}">Reativar conta</button>
               <button class="row-action danger" data-status="Banida" data-codigo="${escapar(usuario.codigo_perfil)}">Banir</button>`
            : usuario.status === 'Pendente'
              ? `<button class="row-action" data-status="Ativa" data-codigo="${escapar(usuario.codigo_perfil)}">Aprovar</button>
                 <button class="row-action danger" data-status="Banida" data-codigo="${escapar(usuario.codigo_perfil)}">Banir</button>${temporaryDeactivation}`
              : `<button class="row-action danger" data-status="Banida" data-codigo="${escapar(usuario.codigo_perfil)}">Banir</button>${temporaryDeactivation}`;
    return `<tr>
      <td><strong>${escapar(usuario.nome)}</strong><small>${escapar(usuario.email)}</small></td>
      <td>${escapar(usuario.perfil)}</td>
      <td><span class="status ${statusClass}">${escapar(statusLabel)}</span></td>
      <td>${acao || '—'}</td>
    </tr>`;
  }).join('');
}

function renderizarDenuncias(denuncias) {
  const lista = document.getElementById('complaintList');
  document.getElementById('navComplaints').textContent = denuncias.length;
  lista.innerHTML = denuncias.length ? denuncias.map((denuncia) => `
    <article class="complaint-card">
      <div class="complaint-heading">
        <strong>${escapar(denuncia.nome_baba)}</strong>
        <span class="counter-highlight danger-highlight">${denuncia.nota}/5 · denúncia de ${denuncia.origem}</span>
      </div>
      <p class="complaint-reasons"><strong>Motivos:</strong> ${denuncia.motivos.map(escapar).join(', ')}</p>
      <p>${denuncia.comentario ? escapar(denuncia.comentario) : 'Nenhum comentário informado.'}</p>
      <small>${new Date(`${denuncia.criada_em.replace(' ', 'T')}Z`).toLocaleString('pt-BR')} · responsável anônimo</small>
    </article>`).join('') : '<p class="empty-state">Nenhuma denúncia de avaliação recebida.</p>';
}

function renderizarCertidoes() {
  const fila = document.getElementById('certificateQueue');
  document.getElementById('navCertidoes').textContent = certidoes.length;
  if (!certidoes.length) {
    fila.innerHTML = '<p class="empty-state">Nenhum documento aguardando análise.</p>';
    return;
  }

  fila.innerHTML = certidoes.map((documento) => {
    const status = documento.status_documento;
    const classeStatus = status === 'Aprovada' ? 'approved' : status === 'Recusada' ? 'rejected' : '';
    const data = documento.atualizado_em
      ? new Date(documento.atualizado_em).toLocaleString('pt-BR')
      : 'Data não informada';
    const tipo = documento.tipo_documento === 'diploma' ? 'Diploma de cuidadora infantil' : 'Certidão de antecedentes';
    return `<article class="certificate-record">
      <div class="certificate-record-main">
        <strong>${escapar(documento.nome_baba)} · ${tipo}</strong>
        <small>${escapar(documento.nome_documento)} · Enviado em ${escapar(data)}</small>
        <span class="certificate-status ${classeStatus}">${escapar(status)}</span>
      </div>
      <div class="certificate-record-actions">
        <button class="outline-button" type="button" data-open-certificate="${escapar(documento.codigo_baba)}" data-document-type="${escapar(documento.tipo_documento)}">Visualizar PDF</button>
      </div>
    </article>`;
  }).join('');
}

async function carregarCertidoes() {
  try {
    certidoes = await requisitar('/admin/api/certidoes');
    renderizarCertidoes();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

async function abrirCertidao(botao) {
  const codigo = botao.dataset.openCertificate;
  const tipo = botao.dataset.documentType;
  const documento = certidoes.find((item) => item.codigo_baba === codigo && item.tipo_documento === tipo);
  if (!documento) return;
  documentoEmAnalise = documento;
  document.getElementById('certificateReviewName').textContent = documento.nome_baba;
  document.getElementById('certificateReviewStatus').textContent =
    `${documento.nome_documento} · ${documento.status_documento} · ${tipo === 'diploma' ? 'Diploma de cuidadora infantil' : 'Certidão de antecedentes'}`;
  document.querySelectorAll('[data-certificate-decision]').forEach((button) => {
    button.hidden = documento.status_documento !== 'Pendente';
  });
  document.querySelector('[data-certificate-decision="Aprovada"]').textContent =
    tipo === 'diploma' ? 'Aprovar diploma' : 'Aprovar certidão';
  botao.disabled = true;
  try {
    const response = await fetch(`/admin/api/babas/${encodeURIComponent(codigo)}/${tipo}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status === 401 || response.status === 403) {
      redirecionarLogin();
      return;
    }
    if (!response.ok) {
      const resultado = await response.json().catch(() => ({}));
      throw new Error(resultado.erro || 'Não foi possível abrir o documento.');
    }
    if (urlPreviaCertidao) URL.revokeObjectURL(urlPreviaCertidao);
    urlPreviaCertidao = URL.createObjectURL(await response.blob());
    document.getElementById('certificateReviewFrame').src = urlPreviaCertidao;
    document.getElementById('certificateReviewDialog').showModal();
  } catch (erro) {
    mostrarToast(erro.message);
  } finally {
    botao.disabled = false;
  }
}

function fecharDialogoCertidao() {
  const dialog = document.getElementById('certificateReviewDialog');
  if (dialog.open) dialog.close();
  document.getElementById('certificateReviewFrame').src = 'about:blank';
  if (urlPreviaCertidao) URL.revokeObjectURL(urlPreviaCertidao);
  urlPreviaCertidao = null;
}

async function decidirCertidao(status) {
  if (!documentoEmAnalise) return;
  const botao = document.querySelector(`[data-certificate-decision="${status}"]`);
  botao.disabled = true;
  try {
    const resposta = await requisitar(`/admin/api/babas/${encodeURIComponent(documentoEmAnalise.codigo_baba)}/${documentoEmAnalise.tipo_documento}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    fecharDialogoCertidao();
    documentoEmAnalise = null;
    mostrarToast(resposta.mensagem);
    await carregarCertidoes();
  } catch (erro) {
    mostrarToast(erro.message);
  } finally {
    botao.disabled = false;
  }
}

function mostrarToast(mensagem) {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.classList.add('visible');
  window.clearTimeout(mostrarToast.timeout);
  mostrarToast.timeout = window.setTimeout(() => toast.classList.remove('visible'), 2800);
}

async function mudarStatus(botao) {
  botao.disabled = true;
  try {
    const diasField = botao.dataset.daysField
      ? document.querySelector(`[data-deactivation-days="${botao.dataset.daysField}"]`)
      : null;
    const body = { status: botao.dataset.status };
    if (diasField) body.dias = Number(diasField.value);
    const resposta = await requisitar(`/admin/api/babas/${encodeURIComponent(botao.dataset.codigo)}/status`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    mostrarToast(resposta.mensagem);
    await carregarDados();
  } catch (erro) {
    mostrarErro(erro.message);
    botao.disabled = false;
  }
}

async function carregarDados() {
  const [resumo, lista] = await Promise.all([
    requisitar('/admin/api/resumo'),
    requisitar('/admin/api/usuarios')
  ]);
  usuarios = lista;
  mostrarResumo(resumo);
  document.getElementById('countAll').textContent = usuarios.length;
  document.getElementById('countNannies').textContent = usuarios.filter((usuario) => usuario.perfil === 'Babá').length;
  document.getElementById('countParents').textContent = usuarios.filter((usuario) => usuario.perfil === 'Responsável').length;
  renderizarUsuarios();
  await Promise.all([carregarDenuncias(), carregarCertidoes()]);
}

async function carregarDenuncias() {
  try {
    renderizarDenuncias(await requisitar('/admin/api/denuncias/avaliacoes'));
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

async function alterarSenha(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const dados = new FormData(form);
  if (dados.get('nova_senha') !== dados.get('confirmar_senha')) {
    mostrarToast('A confirmação da nova senha não corresponde.');
    form.elements.confirmar_senha.focus();
    return;
  }

  const botao = form.querySelector('[type="submit"]');
  botao.disabled = true;
  try {
    const resposta = await requisitar('/admin/api/senha', {
      method: 'PUT',
      body: JSON.stringify({
        senha_atual: dados.get('senha_atual'),
        nova_senha: dados.get('nova_senha')
      })
    });
    form.reset();
    mostrarToast(resposta.mensagem);
  } catch (erro) {
    mostrarToast(erro.message);
  } finally {
    botao.disabled = false;
  }
}

async function iniciar() {
  if (!token) return redirecionarLogin();
  document.getElementById('dateLabel').textContent = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium'
  }).format(new Date());
  try {
    const perfil = await requisitar('/admin/api/sessao');
    document.getElementById('adminName').textContent = perfil.nome;
    document.getElementById('adminEmail').textContent = perfil.email_1;
    document.getElementById('accountEmail').textContent = perfil.email_1;
    await carregarDados();
    window.setInterval(carregarDenuncias, 5000);
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

document.querySelectorAll('.side-link').forEach((item) => item.addEventListener('click', () => showScreen(item.dataset.screen)));
document.querySelectorAll('[data-screen-target]').forEach((item) => item.addEventListener('click', () => showScreen(item.dataset.screenTarget)));
document.querySelectorAll('[data-filter]').forEach((item) => item.addEventListener('click', () => {
  filtroPerfil = item.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach((tab) => tab.classList.toggle('active', tab === item));
  renderizarUsuarios();
}));
document.getElementById('userSearch').addEventListener('input', renderizarUsuarios);
document.getElementById('userTable').addEventListener('click', (event) => {
  const botao = event.target.closest('[data-status]');
  if (botao) {
    if (botao.dataset.status === 'Banida' && !window.confirm('Banir esta babá permanentemente do Babysite?')) return;
    if (botao.dataset.restoreAction === 'unban'
      && !window.confirm('Desbanir e ativar esta conta? A babá poderá acessar o Babysite novamente.')) return;
    if (botao.dataset.restoreAction === 'reactivate'
      && !window.confirm('Reativar esta conta agora, antes do fim do prazo de desativação?')) return;
    mudarStatus(botao);
  }
});
document.getElementById('certificateQueue').addEventListener('click', (event) => {
  const botao = event.target.closest('[data-open-certificate]');
  if (botao) abrirCertidao(botao);
});
document.querySelectorAll('[data-certificate-decision]').forEach((button) => {
  button.addEventListener('click', () => decidirCertidao(button.dataset.certificateDecision));
});
document.getElementById('closeCertificateReview').addEventListener('click', fecharDialogoCertidao);
document.getElementById('certificateReviewDialog').addEventListener('close', () => {
  document.getElementById('certificateReviewFrame').src = 'about:blank';
  if (urlPreviaCertidao) URL.revokeObjectURL(urlPreviaCertidao);
  urlPreviaCertidao = null;
});
document.getElementById('adminPasswordForm').addEventListener('submit', alterarSenha);
document.getElementById('logoutButton').addEventListener('click', async () => {
  try {
    await requisitar('/admin/api/sessao', { method: 'DELETE' });
    redirecionarLogin();
  } catch (erro) {
    mostrarErro(erro.message);
  }
});

iniciar();
