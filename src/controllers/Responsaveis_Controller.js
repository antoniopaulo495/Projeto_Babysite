const Responsaveis = require('../models/Responsaveis');

const responsaveisController = {
    // GET /api/responsaveis
    listar: (req, res) => {
        Responsaveis.listarTodos((err, rows) => {
            if (err) {
                return res.status(500).json({ erro: 'Erro ao listar responsáveis.' });
            }
            res.json(rows);
        });
    },

    // POST /api/responsaveis
    cadastrar: (req, res) => {
        const dados = req.body;

        if (!dados.codigo_pais || !dados.usuario_codigo) {
            return res.status(400).json({ erro: 'Código do responsável e código de usuário são obrigatórios.' });
        }

        Responsaveis.criar(dados, (err) => {
            if (err) {
                return res.status(500).json({ erro: 'Erro ao salvar responsável: ' + err.message });
            }
            res.status(201).json({ mensagem: 'Responsável cadastrado com sucesso!' });
        });
    }
};

module.exports = responsaveisController;