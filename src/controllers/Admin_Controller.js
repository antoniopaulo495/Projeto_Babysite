const { scrypt, timingSafeEqual } = require('crypto');
const { promisify } = require('util');
const Baba = require('../models/Baba');
const Admin = require('../models/Admin');
const Sessoes = require('../middleware/Sessoes');

const derivarSenha = promisify(scrypt);
const adminController = {
    entrar: async (req, res) => {
        const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
        const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';
        if (!email || !senha) {
            return res.status(400).json({ erro: 'Informe e-mail e senha.' });
        }

        try {
            const administrador = await Admin.buscarParaLogin(email);
            if (!administrador) {
                return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
            }

            const [sal, hashSalvo] = administrador.senha_hash.split(':');
            const hashRecebido = await derivarSenha(senha, sal, 64);
            const hashEsperado = Buffer.from(hashSalvo, 'hex');
            if (hashRecebido.length !== hashEsperado.length || !timingSafeEqual(hashRecebido, hashEsperado)) {
                return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
            }

            const perfil = {
                usuario_codigo: administrador.usuario_codigo,
                nome: administrador.nome,
                email_1: administrador.email_1,
                tipo_usuario: 'admin'
            };
            return res.json({ token: Sessoes.criar(perfil), perfil });
        } catch (erro) {
            console.error('Erro ao validar acesso administrativo:', erro.message);
            return res.status(500).json({ erro: 'Não foi possível validar o acesso.' });
        }
    },

    perfilAtual: (req, res) => res.json(req.sessao.perfil),

    listarUsuarios: async (req, res) => {
        try {
            res.json(await Admin.listarUsuarios());
        } catch (erro) {
            console.error('Erro ao listar usuários para o painel administrativo:', erro.message);
            res.status(500).json({ erro: 'Não foi possível buscar os usuários.' });
        }
    },

    resumo: async (req, res) => {
        try {
            res.json(await Admin.resumo());
        } catch (erro) {
            console.error('Erro ao buscar resumo administrativo:', erro.message);
            res.status(500).json({ erro: 'Não foi possível carregar os indicadores.' });
        }
    },

    listarDenunciasAvaliacao: async (req, res) => {
        try {
            res.json(await Admin.listarDenunciasAvaliacao());
        } catch (erro) {
            console.error('Erro ao listar denúncias recebidas por avaliações:', erro.message);
            res.status(500).json({ erro: 'Não foi possível carregar as denúncias.' });
        }
    },

    // PUT /admin/api/babas/:codigo/status
    alterarStatusBaba: (req, res) => {
        const { codigo } = req.params;
        const status = req.body?.status;

        if (!['Ativa', 'Pendente', 'Bloqueada'].includes(status)) {
            return res.status(400).json({ erro: 'Informe um status válido para a babá.' });
        }

        Baba.atualizarStatus(codigo, status, function(err) {
            if (err) {
                console.error('Erro ao atualizar status da babá:', err.message);
                return res.status(500).json({ erro: 'Erro ao atualizar status da babá.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ mensagem: 'Babá não encontrada.' });
            }
            res.json({ mensagem: `Status da babá atualizado para '${status}' com sucesso!` });
        });
    },

    excluirBaba: async (req, res) => {
        try {
            const excluida = await Baba.excluirPorCodigo(req.params.codigo);
            if (!excluida) {
                return res.status(404).json({ erro: 'Babá não encontrada.' });
            }
            res.json({ mensagem: 'Cadastro da babá excluído com sucesso.' });
        } catch (erro) {
            console.error('Erro ao excluir cadastro da babá:', erro.message);
            res.status(500).json({ erro: 'Não foi possível excluir o cadastro da babá.' });
        }
    }
};

module.exports = adminController;