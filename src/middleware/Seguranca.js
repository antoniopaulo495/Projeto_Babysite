const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const limitePadrao = {
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({
        erro: 'Muitas tentativas. Aguarde antes de tentar novamente.'
    })
};

const limiteLogin = rateLimit({
    ...limitePadrao,
    windowMs: 15 * 60 * 1000,
    limit: 10
});

const limiteLoginAdmin = rateLimit({
    ...limitePadrao,
    windowMs: 15 * 60 * 1000,
    limit: 5
});

const limiteCadastro = rateLimit({
    ...limitePadrao,
    windowMs: 60 * 60 * 1000,
    limit: 10
});

function configurarSeguranca(app) {
    const saltosProxy = Number(process.env.TRUST_PROXY_HOPS || 0);
    if (!Number.isInteger(saltosProxy) || saltosProxy < 0) {
        throw new Error('TRUST_PROXY_HOPS deve ser um número inteiro igual ou maior que zero.');
    }

    app.disable('x-powered-by');
    app.set('trust proxy', saltosProxy);
    app.use(helmet({
        contentSecurityPolicy: false,
        strictTransportSecurity: process.env.NODE_ENV === 'production'
            ? { maxAge: 15552000, includeSubDomains: true }
            : false
    }));
}

function tratarErroRequisicao(erro, req, res, next) {
    if (erro.type === 'entity.too.large') {
        return res.status(413).json({ erro: 'A requisição excede o limite de 32 KB.' });
    }
    if (erro instanceof SyntaxError && Object.hasOwn(erro, 'body')) {
        return res.status(400).json({ erro: 'O corpo JSON da requisição é inválido.' });
    }
    next(erro);
}

module.exports = {
    configurarSeguranca,
    tratarErroRequisicao,
    limiteLogin,
    limiteLoginAdmin,
    limiteCadastro
};
