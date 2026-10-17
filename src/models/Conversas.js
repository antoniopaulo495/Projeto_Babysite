const db = require('../database/connection');

function executar(sql, valores = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, valores, function (erro) {
            if (erro) return reject(erro);
            resolve(this);
        });
    });
}

function consultar(sql, valores = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, valores, (erro, rows) => erro ? reject(erro) : resolve(rows));
    });
}

function obter(sql, valores = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, valores, (erro, row) => erro ? reject(erro) : resolve(row));
    });
}

function participante(perfil) {
    return perfil.tipo_usuario === 'pais'
        ? { coluna: 'c.codigo_pais', codigo: perfil.codigo_perfil }
        : { coluna: 'c.codigo_baba', codigo: perfil.codigo_perfil };
}

const Conversas = {
    criarOuBuscar: async (codigoPais, codigoBaba) => {
        await executar(
            `INSERT OR IGNORE INTO conversa (codigo_pais, codigo_baba)
             SELECT p.codigo_pais, b.codigo_baba
             FROM pais p CROSS JOIN baba b
             WHERE p.codigo_pais = ? AND b.codigo_baba = ? AND b.status_cadastro = 'Ativa'`,
            [codigoPais, codigoBaba]
        );
        return obter(
            'SELECT conversa_id, codigo_pais, codigo_baba FROM conversa WHERE codigo_pais = ? AND codigo_baba = ?',
            [codigoPais, codigoBaba]
        );
    },

    listar: async (perfil) => {
        const { coluna, codigo } = participante(perfil);
        const counterpart = perfil.tipo_usuario === 'pais' ? 'b.nome' : 'p.nome';
        const rows = await consultar(
            `SELECT c.conversa_id, c.codigo_pais, c.codigo_baba, ${counterpart} AS nome_contato,
                    ${perfil.tipo_usuario === 'pais' ? 'c.codigo_baba' : 'c.codigo_pais'} AS codigo_contato,
                    m.conteudo AS ultima_mensagem, m.enviada_em AS ultima_mensagem_em
             FROM conversa c
             JOIN pais p ON p.codigo_pais = c.codigo_pais
             JOIN baba b ON b.codigo_baba = c.codigo_baba
             LEFT JOIN mensagem m ON m.mensagem_id = (
                 SELECT mensagem_id FROM mensagem WHERE conversa_id = c.conversa_id
                 ORDER BY mensagem_id DESC LIMIT 1
             )
             WHERE ${coluna} = ?
             ORDER BY COALESCE(m.mensagem_id, c.conversa_id) DESC`,
            [codigo]
        );
        return rows;
    },

    pertenceAoPerfil: (conversaId, perfil) => {
        const { coluna, codigo } = participante(perfil);
        return obter(
            `SELECT c.conversa_id FROM conversa c WHERE c.conversa_id = ? AND ${coluna} = ?`,
            [conversaId, codigo]
        );
    },

    listarMensagens: (conversaId) => consultar(
        `SELECT m.mensagem_id, m.conversa_id, m.remetente_usuario_codigo,
                u.nome AS nome_remetente, m.conteudo, m.enviada_em
         FROM mensagem m
         JOIN usuario u ON u.usuario_codigo = m.remetente_usuario_codigo
         WHERE m.conversa_id = ?
         ORDER BY m.mensagem_id`,
        [conversaId]
    ),

    enviarMensagem: async (conversaId, usuarioCodigo, conteudo) => {
        const resultado = await executar(
            'INSERT INTO mensagem (conversa_id, remetente_usuario_codigo, conteudo) VALUES (?, ?, ?)',
            [conversaId, usuarioCodigo, conteudo]
        );
        return obter(
            `SELECT m.mensagem_id, m.conversa_id, m.remetente_usuario_codigo,
                    u.nome AS nome_remetente, m.conteudo, m.enviada_em
             FROM mensagem m
             JOIN usuario u ON u.usuario_codigo = m.remetente_usuario_codigo
             WHERE m.mensagem_id = ?`,
            [resultado.lastID]
        );
    }
};

module.exports = Conversas;
