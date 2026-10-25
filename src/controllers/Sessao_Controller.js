const { scrypt, timingSafeEqual } = require('crypto');
const { promisify } = require('util');
const Usuario = require('../models/Usuario');
const Baba = require('../models/Baba');
const Sessoes = require('../middleware/Sessoes');

const derivarSenha = promisify(scrypt);

const sessaoController = {
    entrar: (req, res) => {
        res.set('Cache-Control', 'no-store');
        const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
        const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';
        if (!email || !senha) {
            return res.status(400).json({ erro: 'Informe e-mail e senha.' });
        }

        Usuario.buscarParaLogin(email, async (erro, usuario) => {
            if (erro) return res.status(500).json({ erro: 'Não foi possível validar o acesso.' });
            if (!usuario) return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });

            try {
                const [sal, hashSalvo] = usuario.senha_hash.split(':');
                const hashRecebido = await derivarSenha(senha, sal, 64);
                const hashEsperado = Buffer.from(hashSalvo, 'hex');
                if (hashRecebido.length !== hashEsperado.length || !timingSafeEqual(hashRecebido, hashEsperado)) {
                    return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
                }

                if (usuario.status_cadastro === 'Banida' || usuario.status_cadastro === 'Bloqueada') {
                    return res.status(403).json({
                        status_conta: 'Banida',
                        erro: 'Esta conta foi banida e não tem mais acesso ao Babysite.'
                    });
                }

                if (usuario.status_cadastro === 'Desativada') {
                    const token = Sessoes.criar(usuario);
                    return res.status(403).json({
                        status_conta: 'Desativada',
                        desativada_ate: usuario.desativada_ate,
                        desativada_dias: usuario.desativada_dias,
                        token,
                        erro: 'Esta conta está temporariamente desativada.'
                    });
                }

                const token = Sessoes.criar(usuario);
                const { senha_hash, ...perfil } = usuario;
                return res.json({ token, perfil });
            } catch (erroSenha) {
                return res.status(500).json({ erro: 'Não foi possível validar o acesso.' });
            }
        });
    },

    perfilAtual: async (req, res) => {
        if (req.sessao.perfil.tipo_usuario === 'baba') {
            try {
                const acesso = await Baba.buscarAcesso(req.sessao.perfil.codigo_perfil);
                if (!acesso) return res.status(404).json({ erro: 'Perfil de babá não encontrado.' });
                Object.assign(req.sessao.perfil, acesso);
                if (acesso.status_cadastro === 'Banida' || acesso.status_cadastro === 'Bloqueada') {
                    return res.status(423).json({ status_conta: 'Banida', erro: 'Esta conta foi banida.' });
                }
                if (acesso.status_cadastro === 'Desativada') {
                    return res.status(423).json({
                        status_conta: 'Desativada',
                        desativada_ate: acesso.desativada_ate,
                        desativada_dias: acesso.desativada_dias,
                        erro: 'Esta conta está temporariamente desativada.'
                    });
                }
            } catch (erro) {
                console.error('Não foi possível consultar o status da conta.', erro);
                return res.status(500).json({ erro: 'Não foi possível carregar seu perfil.' });
            }
        }
        res.json(req.sessao.perfil);
    },
    sair: Sessoes.encerrar
};

module.exports = sessaoController;