const { scrypt, timingSafeEqual } = require('crypto');
const { promisify } = require('util');
const Usuario = require('../models/Usuario');
const Sessoes = require('../middleware/Sessoes');

const derivarSenha = promisify(scrypt);

const sessaoController = {
    entrar: (req, res) => {
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

                const token = Sessoes.criar(usuario);
                const { senha_hash, ...perfil } = usuario;
                return res.json({ token, perfil });
            } catch (erroSenha) {
                return res.status(500).json({ erro: 'Não foi possível validar o acesso.' });
            }
        });
    },

    perfilAtual: (req, res) => res.json(req.sessao.perfil),
    sair: Sessoes.encerrar
};

module.exports = sessaoController;