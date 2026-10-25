const { randomBytes } = require('crypto');
const Baba = require('../models/Baba');

const duracaoSessaoMs = 12 * 60 * 60 * 1000;
const inatividadeMaximaMs = 30 * 60 * 1000;
const sessoes = new Map();

function criar(perfil) {
    const token = randomBytes(32).toString('hex');
    const { senha_hash, ...dadosPerfil } = perfil;
    const agora = Date.now();
    sessoes.set(token, {
        perfil: dadosPerfil,
        criadaEm: agora,
        ultimaAtividadeEm: agora,
        expiraEm: agora + inatividadeMaximaMs
    });
    return token;
}

function exigirAutenticacao(req, res, next) {
    const token = req.get('Authorization')?.replace(/^Bearer\s+/i, '');
    const sessao = token && sessoes.get(token);
    const agora = Date.now();
    if (!sessao
        || sessao.expiraEm <= agora
        || sessao.ultimaAtividadeEm + inatividadeMaximaMs <= agora
        || sessao.criadaEm + duracaoSessaoMs <= agora) {
        if (token) sessoes.delete(token);
        return res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
    }
    sessao.ultimaAtividadeEm = agora;
    sessao.expiraEm = Math.min(agora + inatividadeMaximaMs, sessao.criadaEm + duracaoSessaoMs);
    req.sessao = sessao;
    res.set('Cache-Control', 'no-store');
    next();
}

function exigirAdministrador(req, res, next) {
    if (req.sessao.perfil.tipo_usuario !== 'admin') {
        return res.status(403).json({ erro: 'Acesso restrito a administradores.' });
    }
    next();
}

async function exigirContaAtiva(req, res, next) {
    if (req.sessao.perfil.tipo_usuario !== 'baba') return next();
    try {
        const acesso = await Baba.buscarAcesso(req.sessao.perfil.codigo_perfil);
        if (!acesso) {
            return res.status(401).json({ erro: 'Perfil de babá não encontrado.' });
        }
        req.sessao.perfil.status_cadastro = acesso.status_cadastro;
        req.sessao.perfil.desativada_ate = acesso.desativada_ate;
        req.sessao.perfil.desativada_dias = acesso.desativada_dias;
        if (acesso.status_cadastro === 'Banida' || acesso.status_cadastro === 'Bloqueada') {
            return res.status(423).json({ status_conta: 'Banida', erro: 'Esta conta foi banida e não tem mais acesso ao Babysite.' });
        }
        if (acesso.status_cadastro === 'Desativada') {
            return res.status(423).json({
                status_conta: 'Desativada',
                desativada_ate: acesso.desativada_ate,
                desativada_dias: acesso.desativada_dias,
                erro: 'Esta conta está temporariamente desativada.'
            });
        }
        next();
    } catch (erro) {
        console.error('Não foi possível validar o status da conta da babá.', erro);
        res.status(500).json({ erro: 'Não foi possível validar o acesso à conta.' });
    }
}

function encerrar(req, res) {
    const token = req.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (token) sessoes.delete(token);
    res.status(204).end();
}

const limpezaSessoes = setInterval(() => {
    const agora = Date.now();
    for (const [token, sessao] of sessoes) {
        if (sessao.expiraEm <= agora
            || sessao.ultimaAtividadeEm + inatividadeMaximaMs <= agora
            || sessao.criadaEm + duracaoSessaoMs <= agora) {
            sessoes.delete(token);
        }
    }
}, 15 * 60 * 1000);
limpezaSessoes.unref();

module.exports = { criar, exigirAutenticacao, exigirContaAtiva, exigirAdministrador, encerrar };