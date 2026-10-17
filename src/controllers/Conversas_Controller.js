const Conversas = require('../models/Conversas');
const Agendamentos = require('../models/Agendamentos');

function autorizado(req, res) {
    if (!['pais', 'baba'].includes(req.sessao.perfil.tipo_usuario)) {
        res.status(403).json({ erro: 'Apenas responsáveis e babás podem acessar as conversas.' });
        return false;
    }
    return true;
}

function idValido(id) {
    return /^\d+$/.test(id) && Number(id) > 0;
}

async function executarComResposta(res, operacao, mensagemErro) {
    try {
        res.json(await operacao());
    } catch (erro) {
        console.error(mensagemErro, erro);
        res.status(500).json({ erro: mensagemErro });
    }
}

const ConversasController = {
    listar: (req, res) => {
        if (!autorizado(req, res)) return;
        executarComResposta(res, () => Conversas.listar(req.sessao.perfil), 'Não foi possível carregar as conversas.');
    },

    iniciar: async (req, res) => {
        if (!autorizado(req, res)) return;
        if (req.sessao.perfil.tipo_usuario !== 'pais') {
            return res.status(403).json({ erro: 'Somente o responsável pode iniciar uma conversa com uma babá.' });
        }
        const codigoBaba = req.body?.codigo_baba;
        if (typeof codigoBaba !== 'string' || !codigoBaba.trim()) {
            return res.status(400).json({ erro: 'Informe o perfil da babá para iniciar a conversa.' });
        }

        try {
            if (!await Agendamentos.babaAtivaExiste(codigoBaba)) {
                return res.status(404).json({ erro: 'Perfil de babá ativa não encontrado.' });
            }
            const conversa = await Conversas.criarOuBuscar(req.sessao.perfil.codigo_perfil, codigoBaba);
            if (!conversa) return res.status(404).json({ erro: 'Não foi possível iniciar a conversa com este perfil.' });
            res.status(201).json(conversa);
        } catch (erro) {
            console.error('Não foi possível iniciar a conversa.', erro);
            res.status(500).json({ erro: 'Não foi possível iniciar a conversa.' });
        }
    },

    listarMensagens: async (req, res) => {
        if (!autorizado(req, res)) return;
        if (!idValido(req.params.id)) return res.status(400).json({ erro: 'Conversa inválida.' });
        try {
            const conversaId = Number(req.params.id);
            if (!await Conversas.pertenceAoPerfil(conversaId, req.sessao.perfil)) {
                return res.status(404).json({ erro: 'Conversa não encontrada.' });
            }
            res.json(await Conversas.listarMensagens(conversaId));
        } catch (erro) {
            console.error('Não foi possível carregar as mensagens.', erro);
            res.status(500).json({ erro: 'Não foi possível carregar as mensagens.' });
        }
    },

    enviarMensagem: async (req, res) => {
        if (!autorizado(req, res)) return;
        if (!idValido(req.params.id)) return res.status(400).json({ erro: 'Conversa inválida.' });
        const conteudo = req.body?.conteudo;
        if (typeof conteudo !== 'string' || !conteudo.trim() || conteudo.trim().length > 4000) {
            return res.status(400).json({ erro: 'A mensagem deve conter de 1 a 4000 caracteres.' });
        }

        try {
            const conversaId = Number(req.params.id);
            if (!await Conversas.pertenceAoPerfil(conversaId, req.sessao.perfil)) {
                return res.status(404).json({ erro: 'Conversa não encontrada.' });
            }
            const mensagem = await Conversas.enviarMensagem(
                conversaId,
                req.sessao.perfil.usuario_codigo,
                conteudo.trim()
            );
            res.status(201).json(mensagem);
        } catch (erro) {
            console.error('Não foi possível enviar a mensagem.', erro);
            res.status(500).json({ erro: 'Não foi possível enviar a mensagem.' });
        }
    }
};

module.exports = ConversasController;
