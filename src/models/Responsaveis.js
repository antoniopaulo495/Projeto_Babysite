const db = require('../database/connection');

const Responsaveis = {
    // Listar todos os responsáveis com dados da tabela usuário base
    listarTodos: (callback) => {
        const sql = `SELECT r.codigo_pais, u.nome, u.cpf, u.email_1, u.telefone 
                     FROM pais AS r 
                     INNER JOIN usuario AS u ON r.usuario_codigo = u.usuario_codigo`;
        db.all(sql, [], callback);
    },

    // Buscar responsável específico pelo código
    buscarPorCodigo: (codigo_pais, callback) => {
        const sql = `SELECT r.codigo_pais, u.nome, u.cpf, u.email_1, u.telefone 
                     FROM pais AS r 
                     INNER JOIN usuario AS u ON r.usuario_codigo = u.usuario_codigo
                     WHERE r.codigo_pais = ?`;
        db.get(sql, [codigo_pais], callback);
    },

    // Cadastrar responsável
    criar: (dados, callback) => {
        const { codigo_pais, cpf, email_1, email_2, telefone, nome, usuario_codigo } = dados;
        const sql = `INSERT INTO pais (codigo_pais, cpf, email_1, email_2, telefone, nome, usuario_codigo) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [codigo_pais, cpf, email_1, email_2, telefone, nome, usuario_codigo], callback);
    }
};

module.exports = Responsaveis;