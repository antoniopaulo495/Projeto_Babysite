const db = require('../database/connection');
const gerarCodigoUsuario = require('../utils/CodigoUsuario');

const Usuario = {
    // Buscar todos os usuários
    buscarTodos: (callback) => {
        const sql = 'SELECT * FROM usuario';
        db.all(sql, [], callback);
    },

    // Buscar usuário por código (12 dígitos)
    buscarPorCodigo: (usuario_codigo, callback) => {
        const sql = 'SELECT * FROM usuario WHERE usuario_codigo = ?';
        db.get(sql, [usuario_codigo], callback);
    },

        buscarParaLogin: (email, callback) => {
            const sql = `SELECT u.usuario_codigo, u.nome, u.email_1, u.telefone, c.senha_hash,
                                CASE WHEN p.codigo_pais IS NOT NULL THEN 'pais' ELSE 'baba' END AS tipo_usuario,
                                COALESCE(p.codigo_pais, b.codigo_baba) AS codigo_perfil,
                                b.status_cadastro, b.foto
                         FROM usuario AS u
                         INNER JOIN credencial AS c ON c.usuario_codigo = u.usuario_codigo
                         LEFT JOIN pais AS p ON p.usuario_codigo = u.usuario_codigo
                         LEFT JOIN baba AS b ON b.usuario_codigo = u.usuario_codigo
                         LEFT JOIN administrador AS a ON a.usuario_codigo = u.usuario_codigo
                         WHERE lower(u.email_1) = lower(?) AND a.usuario_codigo IS NULL`;
            db.get(sql, [email], callback);
        },

        buscarPerfilPorCodigo: (usuario_codigo, callback) => {
            const sql = `SELECT u.usuario_codigo, u.nome, u.email_1, u.telefone,
                                CASE WHEN p.codigo_pais IS NOT NULL THEN 'pais' ELSE 'baba' END AS tipo_usuario,
                                COALESCE(p.codigo_pais, b.codigo_baba) AS codigo_perfil,
                                b.status_cadastro, b.foto
                         FROM usuario AS u
                         LEFT JOIN pais AS p ON p.usuario_codigo = u.usuario_codigo
                         LEFT JOIN baba AS b ON b.usuario_codigo = u.usuario_codigo
                         WHERE u.usuario_codigo = ?`;
            db.get(sql, [usuario_codigo], callback);
        },

    // Criar novo usuário
    criar: (dados, callback) => {
        const usuario_codigo = gerarCodigoUsuario();
        const { cpf, email_1, email_2, telefone, nome } = dados;
        const sql = `INSERT INTO usuario (usuario_codigo, cpf, email_1, email_2, telefone, nome) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
        db.run(sql, [usuario_codigo, cpf, email_1, email_2, telefone, nome], (erro) => {
            callback(erro, usuario_codigo);
        });
    }
};

module.exports = Usuario;