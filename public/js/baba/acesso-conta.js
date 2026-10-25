const params = new URLSearchParams(window.location.search);
const statusConta = params.get('status');
const fimDesativacao = params.get('ate');
const diasDesativacao = Number(params.get('dias'));
const token = BabysiteSession.get('baba');
const titulo = document.getElementById('accountStatusTitle');
const mensagem = document.getElementById('accountStatusMessage');
const tempo = document.getElementById('accountStatusTime');
const botaoReativar = document.getElementById('reactivateAccount');

function mostrarBanimento() {
  document.getElementById('accountStatusEyebrow').textContent = 'CONTA BANIDA';
  titulo.textContent = 'Esta conta não tem mais acesso';
  mensagem.textContent = 'O acesso ao Babysite por meio desta conta foi encerrado. Se você acredita que isso ocorreu por engano, entre em contato com a administração.';
  tempo.hidden = true;
  botaoReativar.hidden = true;
  if (token) BabysiteSession.clear('baba', token);
}

function formatarData(data) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(data);
}

function atualizarEstadoDesativacao() {
  const dataFinal = new Date(fimDesativacao);
  if (!Number.isFinite(dataFinal.valueOf())) {
    mensagem.textContent = 'Não foi possível verificar o prazo de desativação. Tente entrar novamente ou fale com a administração.';
    tempo.textContent = '';
    botaoReativar.hidden = true;
    return;
  }

  const restante = dataFinal.valueOf() - Date.now();
  const duracao = diasDesativacao || 1;
  const unidadeDuracao = duracao === 1 ? 'dia' : 'dias';
  document.getElementById('accountStatusEyebrow').textContent = 'CONTA TEMPORARIAMENTE DESATIVADA';
  titulo.textContent = 'Seu acesso está temporariamente desativado';
  mensagem.textContent = `Sua conta foi desativada por ${duracao} ${unidadeDuracao}.`;
  botaoReativar.hidden = false;

  if (restante > 0) {
    tempo.textContent = `A reativação estará disponível a partir de ${formatarData(dataFinal)}.`;
    botaoReativar.disabled = true;
    botaoReativar.textContent = 'Reativar após o prazo';
    return;
  }

  tempo.textContent = 'O prazo terminou. Você já pode reativar sua conta.';
  botaoReativar.disabled = false;
  botaoReativar.textContent = 'Reativar conta';
}

async function reativarConta() {
  if (botaoReativar.disabled || !token) return;
  botaoReativar.disabled = true;
  try {
    const resposta = await fetch('/api/conta/reativar', {
      method: 'POST',
      headers: { 'Authorization': ['Bearer', token].join(' ') }
    });
    const resultado = await resposta.json();
    if (!resposta.ok) throw new Error(resultado.erro || 'Não foi possível reativar a conta.');
    window.location.replace('home-baba.html');
  } catch (erro) {
    mensagem.textContent = erro.message;
    atualizarEstadoDesativacao();
  }
}

if (statusConta === 'Banida') {
  mostrarBanimento();
} else if (statusConta === 'Desativada' && fimDesativacao && token) {
  atualizarEstadoDesativacao();
  window.setInterval(atualizarEstadoDesativacao, 60 * 1000);
  botaoReativar.addEventListener('click', reativarConta);
} else {
  window.location.replace('../home/home.html');
}
