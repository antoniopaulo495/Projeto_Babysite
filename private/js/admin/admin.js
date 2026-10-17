const token = sessionStorage.getItem('babysite-admin-token');
const screenNames = {
  inicio: 'INÍCIO',
  usuarios: 'USUÁRIOS',
  certidoes: 'CERTIDÕES',
  denuncias: 'DENÚNCIAS',
  relatorios: 'RELATÓRIOS',
  configuracoes: 'CONFIGURAÇÕES'
};
let usuarios = [];
let filtroPerfil = 'todos';

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
    metricParents: resumo.responsaveis,
    reportUsers: resumo.usuarios,
    reportActive: resumo.babas_ativas,
    reportPending: resumo.cadastros_pendentes,
    navUsers: resumo.usuarios
  };
  Object.entries(campos).forEach(([id, valor]) => {
    document.getElementById(id).textContent = valor;
  });
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
        : usuario.status === 'Bloqueada' ? 'blocked' : 'active';
    const acao = usuario.perfil !== 'Babá' ? ''
      : usuario.status === 'Bloqueada'
        ? `<button class="row-action" data-status="Ativa" data-codigo="${escapar(usuario.codigo_perfil)}">Reativar</button>`
        : usuario.status === 'Pendente'
          ? `<button class="row-action" data-status="Ativa" data-codigo="${escapar(usuario.codigo_perfil)}">Aprovar</button><button class="row-action danger" data-status="Bloqueada" data-codigo="${escapar(usuario.codigo_perfil)}">Bloquear</button>`
          : `<button class="row-action danger" data-status="Bloqueada" data-codigo="${escapar(usuario.codigo_perfil)}">Bloquear</button>`;
    return `<tr>
      <td><strong>${escapar(usuario.nome)}</strong><small>${escapar(usuario.email)}</small></td>
      <td>${escapar(usuario.perfil)}</td>
      <td><span class="status ${statusClass}">${escapar(usuario.status)}</span></td>
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
        <span class="counter-highlight danger-highlight">${denuncia.nota}/5 · denúncia</span>
      </div>
      <p class="complaint-reasons"><strong>Motivos:</strong> ${denuncia.motivos.map(escapar).join(', ')}</p>
      <p>${denuncia.comentario ? escapar(denuncia.comentario) : 'Nenhum comentário informado.'}</p>
      <small>${new Date(`${denuncia.criada_em.replace(' ', 'T')}Z`).toLocaleString('pt-BR')} · responsável anônimo</small>
    </article>`).join('') : '<p class="empty-state">Nenhuma denúncia de avaliação recebida.</p>';
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
    const resposta = await requisitar(`/admin/api/babas/${encodeURIComponent(botao.dataset.codigo)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: botao.dataset.status })
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
  await carregarDenuncias();
}

async function carregarDenuncias() {
  try {
    renderizarDenuncias(await requisitar('/admin/api/denuncias/avaliacoes'));
  } catch (erro) {
    mostrarErro(erro.message);
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
  if (botao) mudarStatus(botao);
});
document.getElementById('logoutButton').addEventListener('click', async () => {
  try {
    await requisitar('/admin/api/sessao', { method: 'DELETE' });
    redirecionarLogin();
  } catch (erro) {
    mostrarErro(erro.message);
  }
});

iniciar();
