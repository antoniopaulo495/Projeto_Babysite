const { randomBytes, scrypt, timingSafeEqual } = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const Baba = require('../models/Baba');
const Admin = require('../models/Admin');
const Sessoes = require('../middleware/Sessoes');
const diretorioUploads = path.resolve(__dirname, '../uploads/babas');

function caminhoDocumento(caminhoRelativo) {
    if (typeof caminhoRelativo !== 'string' || !caminhoRelativo) return null;
    const absoluto = path.resolve(diretorioUploads, caminhoRelativo);
    return absoluto.startsWith(`${diretorioUploads}${path.sep}`) ? absoluto : null;
}

const derivarSenha = promisify(scrypt);
const adminController = {
    entrar: async (req, res) => {
        res.set('Cache-Control', 'no-store');
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

    alterarSenha: async (req, res) => {
        const senhaAtual = typeof req.body?.senha_atual === 'string' ? req.body.senha_atual : '';
        const novaSenha = typeof req.body?.nova_senha === 'string' ? req.body.nova_senha : '';
        if (!senhaAtual || novaSenha.length < 8 || novaSenha.length > 256) {
            return res.status(400).json({ erro: 'Informe a senha atual e uma nova senha com pelo menos 8 caracteres.' });
        }

        try {
            const credencial = await Admin.buscarCredencialPorCodigo(req.sessao.perfil.usuario_codigo);
            if (!credencial) return res.status(404).json({ erro: 'Credencial administrativa não encontrada.' });

            const [sal, hashSalvo] = credencial.senha_hash.split(':');
            const hashRecebido = await derivarSenha(senhaAtual, sal, 64);
            const hashEsperado = Buffer.from(hashSalvo, 'hex');
            if (hashRecebido.length !== hashEsperado.length || !timingSafeEqual(hashRecebido, hashEsperado)) {
                return res.status(400).json({ erro: 'A senha atual está incorreta.' });
            }
            if (senhaAtual === novaSenha) {
                return res.status(400).json({ erro: 'Escolha uma senha diferente da atual.' });
            }

            const novoSal = randomBytes(16).toString('hex');
            const novoHash = (await derivarSenha(novaSenha, novoSal, 64)).toString('hex');
            const atualizada = await Admin.atualizarSenhaHash(
                req.sessao.perfil.usuario_codigo,
                `${novoSal}:${novoHash}`
            );
            if (!atualizada) return res.status(404).json({ erro: 'Credencial administrativa não encontrada.' });
            res.json({ mensagem: 'Senha atualizada com sucesso.' });
        } catch (erro) {
            console.error('Erro ao alterar senha administrativa:', erro.message);
            res.status(500).json({ erro: 'Não foi possível atualizar a senha.' });
        }
    },

    listarUsuarios: async (req, res) => {
        try {
            res.json(await Admin.listarUsuarios());
        } catch (erro) {
            console.error('Erro ao listar usuários para o painel administrativo:', erro.message);
            res.status(500).json({ erro: 'Não foi possível buscar os usuários.' });
        }
    },

    listarCertidoes: async (req, res) => {
        try {
            res.json(await Admin.listarCertidoes());
        } catch (erro) {
            console.error('Erro ao listar certidões:', erro.message);
            res.status(500).json({ erro: 'Não foi possível carregar as certidões.' });
        }
    },

    visualizarCertidao: async (req, res) => {
        try {
            const perfil = await Baba.buscarMeuPerfil(req.params.codigo);
            const arquivo = caminhoDocumento(perfil?.certidao_caminho);
            if (!perfil || !arquivo) return res.status(404).json({ erro: 'Certidão não encontrada.' });
            const pdf = await fs.readFile(arquivo);
            const nome = encodeURIComponent(perfil.certidao_nome || 'certidao.pdf');
            res.type('application/pdf').set('Content-Disposition', `inline; filename*=UTF-8''${nome}`).send(pdf);
        } catch (erro) {
            if (erro.code === 'ENOENT') return res.status(404).json({ erro: 'Certidão não encontrada.' });
            console.error('Erro ao abrir certidão para análise:', erro.message);
            res.status(500).json({ erro: 'Não foi possível abrir a certidão.' });
        }
    },

    visualizarDiploma: async (req, res) => {
        try {
            const perfil = await Baba.buscarMeuPerfil(req.params.codigo);
            const arquivo = caminhoDocumento(perfil?.diploma_caminho);
            if (!perfil || !arquivo) return res.status(404).json({ erro: 'Diploma não encontrado.' });
            const pdf = await fs.readFile(arquivo);
            const nome = encodeURIComponent(perfil.diploma_nome || 'diploma-cuidadora.pdf');
            res.type('application/pdf').set('Content-Disposition', `inline; filename*=UTF-8''${nome}`).send(pdf);
        } catch (erro) {
            if (erro.code === 'ENOENT') return res.status(404).json({ erro: 'Diploma não encontrado.' });
            console.error('Erro ao abrir diploma para análise:', erro.message);
            res.status(500).json({ erro: 'Não foi possível abrir o diploma.' });
        }
    },

    alterarStatusDiploma: async (req, res) => {
        const status = req.body?.status;
        if (!['Aprovada', 'Recusada'].includes(status)) {
            return res.status(400).json({ erro: 'Selecione aprovar ou recusar o diploma.' });
        }
        try {
            const resultado = await Baba.atualizarStatusDiploma(req.params.codigo, status);
            if (!resultado.changes) return res.status(404).json({ erro: 'Diploma não encontrado.' });
            res.json({ mensagem: `Diploma ${status.toLowerCase()} com sucesso.` });
        } catch (erro) {
            console.error('Erro ao revisar diploma:', erro.message);
            res.status(500).json({ erro: 'Não foi possível atualizar o status do diploma.' });
        }
    },

    alterarStatusCertidao: async (req, res) => {
        const status = req.body?.status;
        if (!['Aprovada', 'Recusada'].includes(status)) {
            return res.status(400).json({ erro: 'Selecione aprovar ou recusar a certidão.' });
        }
        try {
            const resultado = await Baba.atualizarStatusCertidao(req.params.codigo, status);
            if (!resultado.changes) return res.status(404).json({ erro: 'Certidão não encontrada.' });
            res.json({ mensagem: `Certidão ${status.toLowerCase()} com sucesso.` });
        } catch (erro) {
            console.error('Erro ao revisar certidão:', erro.message);
            res.status(500).json({ erro: 'Não foi possível atualizar o status da certidão.' });
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
        const dias = req.body?.dias;

        if (!['Ativa', 'Pendente', 'Banida', 'Desativada'].includes(status)) {
            return res.status(400).json({ erro: 'Informe um status válido para a babá.' });
        }
        if (status === 'Desativada' && (!Number.isInteger(dias) || dias < 1 || dias > 7)) {
            return res.status(400).json({ erro: 'Escolha um período de desativação entre 1 e 7 dias.' });
        }
        const desativadaAte = status === 'Desativada'
            ? new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString()
            : null;
        const diasDesativada = status === 'Desativada' ? dias : null;

        Baba.atualizarStatus(codigo, status, desativadaAte, diasDesativada, function(err) {
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