(() => {
  const role = document.body.dataset.notificationRole;
  const toggle = document.getElementById('notificationToggle');
  const panel = document.getElementById('notificationPanel');
  const list = document.getElementById('notificationList');
  const count = document.getElementById('notificationCount');
  const summary = document.getElementById('notificationUnreadSummary');
  const markAll = document.getElementById('markAllNotificationsRead');
  if (!role || !toggle || !panel || !list || !count || !summary || !markAll) return;

  let notifications = [];

  async function requestApi(url, options = {}) {
    const token = BabysiteSession.get(role);
    if (!token) throw new Error('Sua sessão expirou. Entre novamente para ver as notificações.');
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.erro || 'Não foi possível atualizar as notificações.');
    }
    return response.status === 204 ? null : response.json();
  }

  function formatDate(value) {
    const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
    return Number.isNaN(date.valueOf())
      ? 'Data não informada'
      : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function render() {
    const unread = notifications.filter((notification) => !notification.lida_em).length;
    count.textContent = unread > 99 ? '99+' : String(unread);
    count.hidden = unread === 0;
    toggle.setAttribute('aria-label', unread
      ? `Abrir notificações, ${unread} não lida${unread === 1 ? '' : 's'}`
      : 'Abrir notificações');
    summary.textContent = unread
      ? `${unread} notificação${unread === 1 ? '' : 'ões'} não lida${unread === 1 ? '' : 's'}`
      : 'Você está em dia';
    markAll.disabled = unread === 0;
    list.replaceChildren();

    if (!notifications.length) {
      const empty = document.createElement('p');
      empty.className = 'notification-empty';
      empty.textContent = 'Tudo tranquilo por aqui. Novos avisos aparecerão nesta caixa.';
      list.append(empty);
      return;
    }

    notifications.forEach((notification) => {
      const item = document.createElement('button');
      item.className = `notification-item${notification.lida_em ? '' : ' unread'}`;
      item.type = 'button';
      item.dataset.notificationId = notification.notificacao_id;
      item.dataset.notificationType = notification.tipo;

      const marker = document.createElement('span');
      marker.className = 'notification-item-marker';
      marker.setAttribute('aria-hidden', 'true');
      const content = document.createElement('span');
      content.className = 'notification-item-content';
      const title = document.createElement('strong');
      title.textContent = notification.titulo;
      const message = document.createElement('span');
      message.textContent = notification.mensagem;
      const date = document.createElement('time');
      date.dateTime = notification.criada_em;
      date.textContent = formatDate(notification.criada_em);
      content.append(title, message, date);
      item.append(marker, content);
      list.append(item);
    });
  }

  async function loadNotifications() {
    try {
      notifications = await requestApi('/api/notificacoes');
      render();
    } catch (error) {
      console.error('Falha ao carregar as notificações.', error);
      if (panel.hidden) return;
      list.replaceChildren();
      const failure = document.createElement('p');
      failure.className = 'notification-empty notification-error';
      failure.textContent = error.message;
      list.append(failure);
    }
  }

  toggle.addEventListener('click', () => {
    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    toggle.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) loadNotifications();
  });

  markAll.addEventListener('click', async () => {
    markAll.disabled = true;
    try {
      await requestApi('/api/notificacoes/lidas', { method: 'POST' });
      await loadNotifications();
    } catch (error) {
      markAll.disabled = false;
      console.error('Falha ao atualizar as notificações.', error);
      list.replaceChildren();
      const failure = document.createElement('p');
      failure.className = 'notification-empty notification-error';
      failure.textContent = error.message;
      list.append(failure);
    }
  });

  list.addEventListener('click', async (event) => {
    const item = event.target.closest('[data-notification-id]');
    if (!item) return;
    try {
      if (notifications.some((notification) =>
        String(notification.notificacao_id) === item.dataset.notificationId && !notification.lida_em
      )) {
        await requestApi(`/api/notificacoes/${item.dataset.notificationId}/lida`, { method: 'POST' });
      }
      if (role === 'pais' && item.dataset.notificationType === 'pagamento_pendente') {
        document.querySelector('[data-screen="pagamentos"]')?.click();
        panel.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      } else if (role === 'baba' && item.dataset.notificationType === 'perfil_incompleto') {
        document.querySelector('[data-screen="perfil"]')?.click();
        panel.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      }
      await loadNotifications();
    } catch (error) {
      console.error('Falha ao abrir a notificação.', error);
      const failure = document.createElement('p');
      failure.className = 'notification-empty notification-error';
      failure.textContent = error.message;
      list.prepend(failure);
    }
  });

  document.addEventListener('click', (event) => {
    if (!panel.hidden && !event.target.closest('.notification-center')) {
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });

  loadNotifications();
  window.setInterval(loadNotifications, 15000);
})();
