const Notificacoes = require('../models/Notificacoes');

function perfilSuportado(req, res) {
    if (!['pais', 'baba'].includes(req.sessao.perfil.tipo_usuario)) {
        res.status(403).json({ erro: 'Esta ação não está disponível para o seu perfil.' });
        return false;
    }
    return true;
}

function idValido(id) {
    return /^\d+$/.test(id) && Number(id) > 0;
}

const NotificacoesController = {
    listar: async (req, res) => {
        if (!perfilSuportado(req, res)) return;
        try {
            res.json(await Notificacoes.listar(req.sessao.perfil));
        } catch (erro) {
            console.error('Não foi possível carregar as notificações.', erro);
            res.status(500).json({ erro: 'Não foi possível carregar as notificações.' });
        }
    },

    denunciarPagamento: async (req, res) => {
        if (req.sessao.perfil.tipo_usuario !== 'baba') {
            return res.status(403).json({ erro: 'Somente a babá vinculada pode enviar este aviso.' });
        }
        if (!idValido(req.params.id)) return res.status(400).json({ erro: 'Contrato inválido.' });
        try {
            const resultado = await Notificacoes.denunciarPagamento(
                Number(req.params.id),
                req.sessao.perfil.codigo_perfil
            );
            if (resultado === 'nao_encontrado') return res.status(404).json({ erro: 'Contrato não encontrado.' });
            if (resultado === 'nao_pendente') {
                return res.status(409).json({ erro: 'O aviso só pode ser enviado para contrato concluído e ainda não pago.' });
            }
            if (resultado === 'duplicada') {
                return res.status(409).json({ erro: 'Um aviso para este contrato já foi enviado.' });
            }
            res.status(201).json({ mensagem: 'Aviso enviado às notificações do responsável.' });
        } catch (erro) {
            console.error('Não foi possível enviar o aviso de pagamento pendente.', erro);
            res.status(500).json({ erro: 'Não foi possível enviar o aviso.' });
        }
    },

    marcarLida: async (req, res) => {
        if (!perfilSuportado(req, res)) return;
        if (!idValido(req.params.id)) return res.status(400).json({ erro: 'Notificação inválida.' });
        try {
            const resultado = await Notificacoes.marcarLida(Number(req.params.id), req.sessao.perfil);
            if (!resultado) return res.status(404).json({ erro: 'Notificação não encontrada.' });
            res.json({ mensagem: 'Notificação marcada como lida.' });
        } catch (erro) {
            console.error('Não foi possível marcar a notificação como lida.', erro);
            res.status(500).json({ erro: 'Não foi possível atualizar a notificação.' });
        }
    },

    marcarTodasLidas: async (req, res) => {
        if (!perfilSuportado(req, res)) return;
        try {
            await Notificacoes.marcarTodasLidas(req.sessao.perfil);
            res.json({ mensagem: 'Todas as notificações foram marcadas como lidas.' });
        } catch (erro) {
            console.error('Não foi possível marcar as notificações como lidas.', erro);
            res.status(500).json({ erro: 'Não foi possível atualizar as notificações.' });
        }
    }
};

module.exports = NotificacoesController;
