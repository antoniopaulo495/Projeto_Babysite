const Baba = require('../models/Baba');
const disponibilidadeValida = require('../utils/Disponibilidade');
const estadosBrasileiros = new Set([
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
    'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
    'SP', 'SE', 'TO', 'ESTADO_1', 'ESTADO_2', 'ESTADO_3', 'ESTADO_4', 'ESTADO_5'
]);

const babaController = {
    // GET /api/babas
    listarAtivas: async (req, res) => {
        try {
            res.json(await Baba.listarAtivas());
        } catch (erro) {
            console.error('Erro ao buscar listagem de babás:', erro.message);
            res.status(500).json({ erro: 'Erro ao buscar listagem de babás.' });
        }
    },

    buscarMeuPerfil: async (req, res) => {
        if (req.sessao.perfil.tipo_usuario !== 'baba'
            || req.sessao.perfil.codigo_perfil !== req.params.codigo) {
            return res.status(403).json({ erro: 'Você só pode consultar seu próprio perfil de babá.' });
        }
        try {
            const perfil = await Baba.buscarMeuPerfil(req.params.codigo);
            if (!perfil) return res.status(404).json({ erro: 'Perfil de babá não encontrado.' });
            res.json(perfil);
        } catch (erro) {
            console.error('Não foi possível carregar o perfil da babá:', erro.message);
            res.status(500).json({ erro: 'Não foi possível carregar o perfil.' });
        }
    },

    atualizarPerfilPublico: async (req, res) => {
        if (req.sessao.perfil.tipo_usuario !== 'baba'
            || req.sessao.perfil.codigo_perfil !== req.params.codigo) {
            return res.status(403).json({ erro: 'Você só pode editar seu próprio perfil de babá.' });
        }

        const { tarifa_hora, estado, municipio } = req.body || {};
        if ((tarifa_hora !== null && typeof tarifa_hora !== 'number')
            || (estado !== undefined && estado !== null && typeof estado !== 'string')
            || (municipio !== undefined && municipio !== null && typeof municipio !== 'string')) {
            return res.status(400).json({ erro: 'Confira o formato da tarifa, estado e município.' });
        }
        const tarifa = tarifa_hora === null || tarifa_hora === '' ? null : Number(tarifa_hora);
        const estadoNormalizado = typeof estado === 'string' ? estado.trim().toUpperCase() : '';
        const municipioNormalizado = typeof municipio === 'string' ? municipio.trim() : '';
        const localizacaoInformada = estadoNormalizado || municipioNormalizado;
        if ((tarifa !== null && (!Number.isFinite(tarifa) || tarifa <= 0 || tarifa > 100000))
            || (localizacaoInformada && (!estadosBrasileiros.has(estadoNormalizado)
                || !municipioNormalizado || municipioNormalizado.length > 100))) {
            return res.status(400).json({ erro: 'Informe uma tarifa válida e, se cadastrar localização, um estado e município válidos.' });
        }

        try {
            await Baba.atualizarPerfilPublico(req.params.codigo, {
                tarifa_hora: tarifa,
                estado: localizacaoInformada ? estadoNormalizado : null,
                municipio: localizacaoInformada ? municipioNormalizado : null
            });
            res.json({ mensagem: 'Perfil atualizado com sucesso.' });
        } catch (erro) {
            console.error('Não foi possível atualizar o perfil público da babá:', erro.message);
            res.status(500).json({ erro: 'Não foi possível atualizar o perfil.' });
        }
    },

    buscarDisponibilidade: (req, res) => {
        Baba.buscarPorCodigo(req.params.codigo, async (erro, baba) => {
            if (erro) return res.status(500).json({ erro: 'Erro ao buscar perfil da babá.' });
            if (!baba) return res.status(404).json({ erro: 'Perfil de babá não encontrado.' });
            try {
                res.json(await Baba.listarDisponibilidade(req.params.codigo));
            } catch (erroConsulta) {
                res.status(500).json({ erro: 'Erro ao buscar disponibilidade.' });
            }
        });
    },

    salvarDisponibilidade: (req, res) => {
        if (req.sessao.perfil.tipo_usuario !== 'baba'
            || req.sessao.perfil.codigo_perfil !== req.params.codigo) {
            return res.status(403).json({ erro: 'Você só pode alterar sua própria disponibilidade.' });
        }
        const disponibilidade = req.body?.disponibilidade;
        if (!disponibilidadeValida(disponibilidade)) {
            return res.status(400).json({ erro: 'Informe os dias e horários de disponibilidade.' });
        }

        Baba.buscarPorCodigo(req.params.codigo, async (erro, baba) => {
            if (erro) return res.status(500).json({ erro: 'Erro ao buscar perfil da babá.' });
            if (!baba) return res.status(404).json({ erro: 'Perfil de babá não encontrado.' });
            try {
                await Baba.salvarDisponibilidade(req.params.codigo, disponibilidade);
                res.json({ mensagem: 'Disponibilidade atualizada com sucesso.' });
            } catch (erroAtualizacao) {
                res.status(500).json({ erro: 'Não foi possível salvar a disponibilidade.' });
            }
        });
    }
};

module.exports = babaController;