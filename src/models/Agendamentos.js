const db = require('../database/connection');

let filaTransacoes = Promise.resolve();

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

function transacionar(operacao) {
    const atual = filaTransacoes.then(async () => {
        await executar('BEGIN IMMEDIATE');
        try {
            const resultado = await operacao();
            await executar('COMMIT');
            return resultado;
        } catch (erro) {
            await executar('ROLLBACK').catch(() => {});
            throw erro;
        }
    });
    filaTransacoes = atual.catch(() => {});
    return atual;
}

function anexarHorariosJson(registros) {
    return registros.map((registro) => ({
        ...registro,
        horarios: JSON.parse(registro.horarios_json)
    }));
}

const Agendamentos = {
    listarSolicitacoes: async (perfil) => {
        const recebidas = perfil.tipo_usuario === 'baba';
        const filtro = recebidas ? 'codigo_baba' : 'codigo_pais';
        const entrevistaSql = `SELECT s.solicitacao_id, s.codigo_pais, s.codigo_baba,
                                      s.data_entrevista, s.hora_entrevista, s.formato,
                                      s.mensagem, s.criada_em, p.nome AS nome_pais, b.nome AS nome_baba,
                                      'entrevista' AS tipo
                               FROM solicitacao_entrevista s
                               JOIN pais p ON p.codigo_pais = s.codigo_pais
                               JOIN baba b ON b.codigo_baba = s.codigo_baba
                               WHERE s.${filtro} = ? ORDER BY s.criada_em`;
        const contratoSql = `SELECT s.solicitacao_id, s.codigo_pais, s.codigo_baba,
                                    s.data_inicio, s.data_fim, s.horarios_json, s.mensagem, s.criada_em,
                                    p.nome AS nome_pais, b.nome AS nome_baba, 'contrato' AS tipo
                             FROM solicitacao_contrato s
                             JOIN pais p ON p.codigo_pais = s.codigo_pais
                             JOIN baba b ON b.codigo_baba = s.codigo_baba
                             WHERE s.${filtro} = ? ORDER BY s.criada_em`;
        const [entrevistas, contratos] = await Promise.all([
            consultar(entrevistaSql, [perfil.codigo_perfil]),
            consultar(contratoSql, [perfil.codigo_perfil])
        ]);
        const contratosComHorarios = anexarHorariosJson(contratos);
        return [...entrevistas, ...contratosComHorarios].sort((a, b) => a.criada_em.localeCompare(b.criada_em));
    },

    listarEntrevistas: async (perfil) => {
        const filtro = perfil.tipo_usuario === 'baba' ? 'e.codigo_baba' : 'e.codigo_pais';
        return consultar(
            `SELECT e.entrevista_id, e.codigo_pais, e.codigo_baba, e.data_entrevista,
                    e.hora_entrevista, e.formato, e.mensagem, e.status, e.criada_em,
                    p.nome AS nome_pais, b.nome AS nome_baba
             FROM entrevista e
             JOIN pais p ON p.codigo_pais = e.codigo_pais
             JOIN baba b ON b.codigo_baba = e.codigo_baba
             WHERE ${filtro} = ? ORDER BY e.data_entrevista, e.hora_entrevista`,
            [perfil.codigo_perfil]
        );
    },

    listarContratos: async (perfil) => {
        const filtro = perfil.tipo_usuario === 'baba' ? 'c.codigo_baba' : 'c.codigo_pais';
        const contratos = await consultar(
            `SELECT c.contrato_id, c.codigo_pais, c.codigo_baba, c.data_inicio, c.data_fim,
                    c.horarios_json, c.mensagem, c.status, c.criado_em, p.nome AS nome_pais,
                    b.nome AS nome_baba, a.avaliacao_id, a.nota, a.comentario,
                    a.motivos_json,
                    a.criada_em AS avaliado_em
             FROM contrato c
             JOIN pais p ON p.codigo_pais = c.codigo_pais
             JOIN baba b ON b.codigo_baba = c.codigo_baba
             LEFT JOIN avaliacao_contrato a ON a.contrato_id = c.contrato_id
             WHERE ${filtro} = ? ORDER BY c.data_inicio`,
            [perfil.codigo_perfil]
        );
        return anexarHorariosJson(contratos).map((contrato) => ({
            ...contrato,
            motivos: contrato.avaliacao_id ? JSON.parse(contrato.motivos_json) : []
        }));
    },

    finalizarContrato: async (contratoId, codigoBaba) => {
        const resultado = await executar(
            `UPDATE contrato SET status = 'Concluído'
             WHERE contrato_id = ? AND codigo_baba = ? AND status = 'Ativo'`,
            [contratoId, codigoBaba]
        );
        if (resultado.changes) return true;
        return obter(
            'SELECT contrato_id, status FROM contrato WHERE contrato_id = ? AND codigo_baba = ?',
            [contratoId, codigoBaba]
        );
    },

    avaliarContrato: (contratoId, codigoPais, nota, comentario, motivos) => transacionar(async () => {
        const contrato = await obter(
            `SELECT contrato_id, codigo_pais, codigo_baba FROM contrato
             WHERE contrato_id = ? AND codigo_pais = ? AND status = 'Concluído'`,
            [contratoId, codigoPais]
        );
        if (!contrato) return null;
        const resultado = await executar(
            `INSERT INTO avaliacao_contrato
             (contrato_id, codigo_pais, codigo_baba, nota, comentario, motivos_json)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT (contrato_id) DO NOTHING`,
            [contratoId, codigoPais, contrato.codigo_baba, nota, comentario, JSON.stringify(motivos)]
        );
        if (!resultado.changes) return false;

        return obter(
            `SELECT avaliacao_id, contrato_id, nota, comentario, motivos_json, criada_em
             FROM avaliacao_contrato WHERE contrato_id = ?`,
            [contratoId]
        ).then((avaliacao) => ({ ...avaliacao, motivos: JSON.parse(avaliacao.motivos_json) }));
    }),

    criarSolicitacaoEntrevista: async (dados) => {
        const resultado = await executar(
            `INSERT INTO solicitacao_entrevista
             (codigo_pais, codigo_baba, data_entrevista, hora_entrevista, formato, mensagem)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [dados.codigo_pais, dados.codigo_baba, dados.data_entrevista, dados.hora_entrevista, dados.formato, dados.mensagem]
        );
        return resultado.lastID;
    },

    criarSolicitacaoContrato: (dados) => transacionar(async () => {
        const resultado = await executar(
            `INSERT INTO solicitacao_contrato
             (codigo_pais, codigo_baba, data_inicio, data_fim, horarios_json, mensagem)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                dados.codigo_pais, dados.codigo_baba, dados.data_inicio, dados.data_fim,
                JSON.stringify(dados.horarios), dados.mensagem
            ]
        );
        return resultado.lastID;
    }),

    aceitarEntrevista: (solicitacaoId, codigoBaba) => transacionar(async () => {
        const solicitacao = await obter(
            'SELECT * FROM solicitacao_entrevista WHERE solicitacao_id = ? AND codigo_baba = ?',
            [solicitacaoId, codigoBaba]
        );
        if (!solicitacao) return null;
        const resultado = await executar(
            `INSERT INTO entrevista
             (codigo_pais, codigo_baba, data_entrevista, hora_entrevista, formato, mensagem)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [solicitacao.codigo_pais, solicitacao.codigo_baba, solicitacao.data_entrevista,
                solicitacao.hora_entrevista, solicitacao.formato, solicitacao.mensagem]
        );
        await executar('DELETE FROM solicitacao_entrevista WHERE solicitacao_id = ?', [solicitacaoId]);
        return resultado.lastID;
    }),

    aceitarContrato: (solicitacaoId, codigoBaba) => transacionar(async () => {
        const solicitacao = await obter(
            'SELECT * FROM solicitacao_contrato WHERE solicitacao_id = ? AND codigo_baba = ?',
            [solicitacaoId, codigoBaba]
        );
        if (!solicitacao) return null;
        const resultado = await executar(
            `INSERT INTO contrato
             (codigo_pais, codigo_baba, data_inicio, data_fim, horarios_json, mensagem)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                solicitacao.codigo_pais, solicitacao.codigo_baba, solicitacao.data_inicio,
                solicitacao.data_fim, solicitacao.horarios_json, solicitacao.mensagem
            ]
        );
        await executar('DELETE FROM solicitacao_contrato WHERE solicitacao_id = ?', [solicitacaoId]);
        return resultado.lastID;
    }),

    recusarSolicitacao: async (tipo, solicitacaoId, codigoBaba) => {
        const tabela = tipo === 'entrevista' ? 'solicitacao_entrevista' : 'solicitacao_contrato';
        const resultado = await executar(
            `DELETE FROM ${tabela} WHERE solicitacao_id = ? AND codigo_baba = ?`,
            [solicitacaoId, codigoBaba]
        );
        return resultado.changes > 0;
    },

    babaAtivaExiste: (codigoBaba) => obter(
        "SELECT codigo_baba FROM baba WHERE codigo_baba = ? AND status_cadastro = 'Ativa'",
        [codigoBaba]
    )
};

module.exports = Agendamentos;
