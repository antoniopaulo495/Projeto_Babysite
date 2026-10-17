const Usuario = require('../models/Usuario');

const usuarioController = {
    // GET /api/usuarios
    listar: (req, res) => {
        Usuario.buscarTodos((err, rows) => {
            if (err) {
                return res.status(500).json({ erro: 'Erro ao buscar usuários no banco de dados.' });
            }
            res.json(rows);
        });
    },

    // GET /api/usuarios/:codigo
    buscarPorCodigo: (req, res) => {
        const { codigo } = req.params;
        Usuario.buscarPorCodigo(codigo, (err, row) => {
            if (err) {
                return res.status(500).json({ erro: 'Erro ao consultar usuário.' });
            }
            if (!row) {
                return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
            }
            res.json(row);
        });
    },

    // POST /api/usuarios
    cadastrar: (req, res) => {
        const dados = req.body || {};

        if (!dados.cpf || !dados.nome) {
            return res.status(400).json({ erro: 'Campos obrigatórios ausentes.' });
        }

        Usuario.criar(dados, (err, usuarioCodigo) => {
            if (err) {
                return res.status(500).json({ erro: 'Erro ao cadastrar usuário: ' + err.message });
            }
            res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!', usuario_codigo: usuarioCodigo });
        });
    }
};

module.exports = usuarioController;