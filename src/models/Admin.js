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
    buscarCredencialPorCodigo: (usuarioCodigo) => consultarUm(
        'SELECT senha_hash FROM credencial WHERE usuario_codigo = ?',
        [usuarioCodigo]
    ),

    atualizarSenhaHash: (usuarioCodigo, senhaHash) => new Promise((resolve, reject) => {
        db.run(
            'UPDATE credencial SET senha_hash = ? WHERE usuario_codigo = ?',
            [senhaHash, usuarioCodigo],
            function (erro) {
                if (erro) return reject(erro);
                resolve(this.changes > 0);
            }
        );
    }),

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
                COALESCE(b.status_cadastro, 'Ativo') AS status,
                b.desativada_ate, b.desativada_dias
         FROM usuario AS u
         LEFT JOIN baba AS b ON b.usuario_codigo = u.usuario_codigo
         LEFT JOIN pais AS p ON p.usuario_codigo = u.usuario_codigo
         LEFT JOIN administrador AS a ON a.usuario_codigo = u.usuario_codigo
         WHERE a.usuario_codigo IS NULL
         ORDER BY u.nome COLLATE NOCASE`
    ),

    listarCertidoes: () => consultar(
        `SELECT b.codigo_baba, u.nome AS nome_baba, 'certidao' AS tipo_documento,
                b.certidao_nome AS nome_documento, b.certidao_status AS status_documento,
                b.certidao_atualizada_em AS atualizado_em
         FROM baba AS b
         INNER JOIN usuario AS u ON u.usuario_codigo = b.usuario_codigo
         WHERE b.certidao_caminho IS NOT NULL AND b.certidao_status = 'Pendente'
         UNION ALL
         SELECT b.codigo_baba, u.nome AS nome_baba, 'diploma' AS tipo_documento,
                b.diploma_nome AS nome_documento, b.diploma_status AS status_documento,
                b.diploma_atualizado_em AS atualizado_em
         FROM baba AS b
         INNER JOIN usuario AS u ON u.usuario_codigo = b.usuario_codigo
         WHERE b.diploma_caminho IS NOT NULL AND b.diploma_status = 'Pendente'
         ORDER BY atualizado_em ASC`
    ),

    resumo: async () => {
        const [indicadores, usuariosRecentes, denunciasRecentes] = await Promise.all([
            consultarUm(
                `SELECT
                    (SELECT COUNT(*) FROM usuario AS u
                     LEFT JOIN administrador AS a ON a.usuario_codigo = u.usuario_codigo
                     WHERE a.usuario_codigo IS NULL) AS usuarios,
                    (SELECT COUNT(*) FROM baba WHERE status_cadastro = 'Ativa') AS babas_ativas,
                    (SELECT COUNT(*) FROM pais) AS pais_ativos,
                    (SELECT COUNT(*) FROM baba WHERE status_cadastro = 'Pendente') AS cadastros_pendentes`
            ),
            consultar(
                `SELECT u.usuario_codigo, COALESCE(b.codigo_baba, p.codigo_pais) AS codigo_perfil,
                        u.nome, u.email_1 AS email,
                        CASE WHEN b.codigo_baba IS NOT NULL THEN 'Babá' ELSE 'Responsável' END AS perfil,
                        COALESCE(b.status_cadastro, 'Ativa') AS status,
                        u.criado_em
                 FROM usuario AS u
                 LEFT JOIN baba AS b ON b.usuario_codigo = u.usuario_codigo
                 LEFT JOIN pais AS p ON p.usuario_codigo = u.usuario_codigo
                 LEFT JOIN administrador AS a ON a.usuario_codigo = u.usuario_codigo
                 WHERE a.usuario_codigo IS NULL
                 ORDER BY u.criado_em DESC, u.rowid DESC
                 LIMIT 5`
            ),
            buscarDenunciasAvaliacao(3)
        ]);
        return { ...indicadores, usuarios_recentes: usuariosRecentes, denuncias_recentes: denunciasRecentes };
    },

    listarDenunciasAvaliacao: async () => {
        return buscarDenunciasAvaliacao();
    }
};

async function buscarDenunciasAvaliacao(limite = null) {
    const linhas = await consultar(
            `SELECT 'contrato' AS origem, a.avaliacao_id, b.nome AS nome_baba,
                    a.nota, a.comentario, a.motivos_json, a.criada_em
             FROM avaliacao_contrato AS a
             INNER JOIN baba AS b ON b.codigo_baba = a.codigo_baba
             WHERE a.nota <= 3
             UNION ALL
             SELECT 'entrevista' AS origem, a.avaliacao_id, b.nome AS nome_baba,
                    a.nota, a.comentario, a.motivos_json, a.criada_em
             FROM avaliacao_entrevista AS a
             INNER JOIN entrevista AS e ON e.entrevista_id = a.entrevista_id
             INNER JOIN baba AS b ON b.codigo_baba = e.codigo_baba
             WHERE a.nota <= 3
             ORDER BY criada_em DESC
             ${limite === null ? '' : 'LIMIT ?'}`,
        limite === null ? [] : [limite]
    );
    return linhas.map((linha) => ({
        ...linha,
        motivos: JSON.parse(linha.motivos_json)
    }));
}

module.exports = Admin;
