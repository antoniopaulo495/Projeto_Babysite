const db = require('../database/connection');

function consultar(sql, valores = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, valores, (erro, rows) => erro ? reject(erro) : resolve(rows));
    });
}

function consultarUm(sql, valores = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, valores, (erro, row) => erro ? reject(erro) : resolve(row));
    });
}

const Admin = {
    buscarParaLogin: (email) => consultarUm(
        `SELECT u.usuario_codigo, u.nome, u.email_1, c.senha_hash
         FROM administrador AS a
         INNER JOIN usuario AS u ON u.usuario_codigo = a.usuario_codigo
         INNER JOIN credencial AS c ON c.usuario_codigo = a.usuario_codigo
         WHERE lower(u.email_1) = lower(?)`,
        [email]
    ),

    listarUsuarios: () => consultar(
        `SELECT u.usuario_codigo, COALESCE(b.codigo_baba, p.codigo_pais) AS codigo_perfil,
                u.nome, u.email_1 AS email,
                CASE WHEN b.codigo_baba IS NOT NULL THEN 'Babá' ELSE 'Responsável' END AS perfil,
                COALESCE(b.status_cadastro, 'Ativo') AS status
         FROM usuario AS u
         LEFT JOIN baba AS b ON b.usuario_codigo = u.usuario_codigo
         LEFT JOIN pais AS p ON p.usuario_codigo = u.usuario_codigo
         LEFT JOIN administrador AS a ON a.usuario_codigo = u.usuario_codigo
         WHERE a.usuario_codigo IS NULL
         ORDER BY u.nome COLLATE NOCASE`
    ),

    resumo: () => consultarUm(
        `SELECT
            (SELECT COUNT(*) FROM usuario AS u
             LEFT JOIN administrador AS a ON a.usuario_codigo = u.usuario_codigo
             WHERE a.usuario_codigo IS NULL) AS usuarios,
            (SELECT COUNT(*) FROM baba WHERE status_cadastro = 'Ativa') AS babas_ativas,
            (SELECT COUNT(*) FROM baba WHERE status_cadastro = 'Pendente') AS cadastros_pendentes,
            (SELECT COUNT(*) FROM pais) AS responsaveis`
    ),

    listarDenunciasAvaliacao: async () => {
        const linhas = await consultar(
            `SELECT a.avaliacao_id, b.nome AS nome_baba, a.nota, a.comentario,
                    a.motivos_json, a.criada_em
             FROM avaliacao_contrato AS a
             INNER JOIN baba AS b ON b.codigo_baba = a.codigo_baba
             WHERE a.nota <= 3
             ORDER BY a.criada_em DESC`
        );
        return linhas.map((linha) => ({
            ...linha,
            motivos: JSON.parse(linha.motivos_json)
        }));
    }
};

module.exports = Admin;
