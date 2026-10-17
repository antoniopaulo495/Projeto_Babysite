const { randomBytes } = require('crypto');

const duracaoSessaoMs = 12 * 60 * 60 * 1000;
const sessoes = new Map();

function criar(perfil) {
    const token = randomBytes(32).toString('hex');
    const { senha_hash, ...dadosPerfil } = perfil;
    sessoes.set(token, { perfil: dadosPerfil, expiraEm: Date.now() + duracaoSessaoMs });
    return token;
}

function exigirAutenticacao(req, res, next) {
    const token = req.get('Authorization')?.replace(/^Bearer\s+/i, '');
    const sessao = token && sessoes.get(token);
    if (!sessao || sessao.expiraEm <= Date.now()) {
        if (token) sessoes.delete(token);
        return res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
    }
    req.sessao = sessao;
    next();
}

function exigirAdministrador(req, res, next) {
    if (req.sessao.perfil.tipo_usuario !== 'admin') {
        return res.status(403).json({ erro: 'Acesso restrito a administradores.' });
    }
    next();
}

function encerrar(req, res) {
    const token = req.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (token) sessoes.delete(token);
    res.status(204).end();
}

module.exports = { criar, exigirAutenticacao, exigirAdministrador, encerrar };