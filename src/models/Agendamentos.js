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

function dataAtualNoBrasil() {
    const partes = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(new Date());
    const data = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
    return `${data.year}-${data.month}-${data.day}`;
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

function anexarHorariosJson(registros, tipoRegistro) {
    return registros.map((registro) => {
        let horarios = [];
        try {
            const parsed = JSON.parse(registro.horarios_json || '[]');
            if (Array.isArray(parsed)) {
                horarios = parsed;
            } else {
                console.error(`A solicitação de ${tipoRegistro} ${registro.solicitacao_id || registro.contrato_id} contém horários em formato inválido.`);
            }
        } catch (erro) {
            console.error(`Não foi possível ler os horários da solicitação de ${tipoRegistro} ${registro.solicitacao_id || registro.contrato_id}.`, erro);
        }
        return { ...registro, horarios };
    });
}

const diasIndice = { segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };

function calcularCustoContrato(contrato) {
    const tarifa = Number(contrato.tarifa_hora);
    if (!Number.isFinite(tarifa) || tarifa <= 0 || !contrato.data_inicio || !contrato.data_fim) {
        return { total_horas: null, quantidade_servicos: null, valor_total: null };
    }
    const horarios = contrato.horarios || [];
    const minutosPorDia = new Map();
    for (const horario of horarios) {
        const dia = diasIndice[horario.dia_semana];
        const inicio = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(horario.hora_inicio || '');
        const fim = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(horario.hora_fim || '');
        if (!dia || !inicio || !fim || minutosPorDia.has(dia)) continue;
        const minutos = (Number(fim[1]) * 60 + Number(fim[2])) - (Number(inicio[1]) * 60 + Number(inicio[2]));
        if (minutos <= 0) continue;
        minutosPorDia.set(dia, minutos);
    }
    if (!minutosPorDia.size) {
        return { total_horas: null, quantidade_servicos: null, valor_total: null };
    }
    const primeiroDia = Date.parse(`${contrato.data_inicio}T00:00:00Z`);
    const ultimoDia = Date.parse(`${contrato.data_fim}T00:00:00Z`);
    if (!Number.isFinite(primeiroDia) || !Number.isFinite(ultimoDia) || ultimoDia < primeiroDia) {
        return { total_horas: null, quantidade_servicos: null, valor_total: null };
    }
    const totalDias = Math.floor((ultimoDia - primeiroDia) / 86400000) + 1;
    const semanasCompletas = Math.floor(totalDias / 7);
    const diasRestantes = totalDias % 7;
    const primeiroDiaSemana = new Date(primeiroDia).getUTCDay() || 7;
    let quantidadeServicos = 0;
    let totalMinutos = 0;
    for (const [diaSemana, minutos] of minutosPorDia) {
        let ocorrencias = semanasCompletas;
        for (let deslocamento = 0; deslocamento < diasRestantes; deslocamento += 1) {
            if ((primeiroDiaSemana + deslocamento - 1) % 7 + 1 === diaSemana) ocorrencias += 1;
        }
        quantidadeServicos += ocorrencias;
        totalMinutos += ocorrencias * minutos;
    }
    const horas = Number((totalMinutos / 60).toFixed(2));
    return {
        total_horas: horas,
        quantidade_servicos: quantidadeServicos,
        valor_total: Number((totalMinutos * tarifa / 60).toFixed(2))
    };
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
                                    s.data_inicio, s.data_fim, s.horarios_json, s.tarifa_hora, s.mensagem, s.criada_em,
                                    p.nome AS nome_pais, b.nome AS nome_baba, 'contrato' AS tipo
                             FROM solicitacao_contrato s
                             JOIN pais p ON p.codigo_pais = s.codigo_pais
                             JOIN baba b ON b.codigo_baba = s.codigo_baba
                             WHERE s.${filtro} = ? ORDER BY s.criada_em`;
        const [entrevistas, contratos] = await Promise.all([
            consultar(entrevistaSql, [perfil.codigo_perfil]),
            consultar(contratoSql, [perfil.codigo_perfil])
        ]);
        const contratosComHorarios = anexarHorariosJson(contratos, 'contrato');
        return [...entrevistas, ...contratosComHorarios].sort((a, b) => a.criada_em.localeCompare(b.criada_em));
    },

    listarEntrevistas: async (perfil) => {
        const filtro = perfil.tipo_usuario === 'baba' ? 'e.codigo_baba' : 'e.codigo_pais';
        const entrevistas = await consultar(
            `SELECT e.entrevista_id, e.codigo_pais, e.codigo_baba, e.data_entrevista,
                    e.hora_entrevista, e.formato, e.mensagem, e.status, e.criada_em,
                    p.nome AS nome_pais, b.nome AS nome_baba,
                    a.avaliacao_id, a.nota, a.comentario, a.motivos_json,
                    a.criada_em AS avaliado_em
             FROM entrevista e
             JOIN pais p ON p.codigo_pais = e.codigo_pais
             JOIN baba b ON b.codigo_baba = e.codigo_baba
             LEFT JOIN avaliacao_entrevista a
               ON a.entrevista_id = e.entrevista_id AND a.avaliador_tipo = 'baba' AND ? = 'baba'
             WHERE ${filtro} = ? ORDER BY e.data_entrevista, e.hora_entrevista`,
            [perfil.tipo_usuario, perfil.codigo_perfil]
        );
        return entrevistas.map((entrevista) => ({
            ...entrevista,
            motivos: entrevista.avaliacao_id ? JSON.parse(entrevista.motivos_json) : []
        }));
    },

    listarContratos: async (perfil) => {
        const filtro = perfil.tipo_usuario === 'baba' ? 'c.codigo_baba' : 'c.codigo_pais';
        await executar(
            `UPDATE contrato SET status = 'Concluído'
             WHERE status = 'Ativo' AND data_fim IS NOT NULL AND data_fim < ?`,
            [dataAtualNoBrasil()]
        );
        const contratos = await consultar(
            `SELECT c.contrato_id, c.codigo_pais, c.codigo_baba, c.data_inicio, c.data_fim,
                    c.horarios_json, c.tarifa_hora, c.pagamento_status, c.pago_em,
                    c.mensagem, c.status, c.criado_em, p.nome AS nome_pais,
                    b.nome AS nome_baba, a.avaliacao_id, a.nota, a.comentario,
                    a.motivos_json,
                    a.criada_em AS avaliado_em
             FROM contrato c
             JOIN pais p ON p.codigo_pais = c.codigo_pais
             JOIN baba b ON b.codigo_baba = c.codigo_baba
             LEFT JOIN avaliacao_contrato a ON a.contrato_id = c.contrato_id
             WHERE ${filtro} = ? ${perfil.tipo_usuario === 'baba' ? "AND c.status = 'Ativo'" : ''} ORDER BY c.data_inicio`,
            [perfil.codigo_perfil]
        );
        return anexarHorariosJson(contratos, 'contrato aceito').map((contrato) => ({
            ...contrato,
            ...calcularCustoContrato(contrato),
            motivos: contrato.avaliacao_id ? JSON.parse(contrato.motivos_json) : []
        }));
    },

    listarPagamentos: async (perfil) => {
        const filtro = perfil.tipo_usuario === 'baba' ? 'c.codigo_baba' : 'c.codigo_pais';
        const contratos = await consultar(
            `SELECT c.contrato_id, c.codigo_pais, c.codigo_baba, c.data_inicio, c.data_fim,
                    c.horarios_json, c.tarifa_hora, c.pagamento_status, c.pago_em,
                    c.status AS status_contrato, p.nome AS nome_pais, b.nome AS nome_baba,
                    EXISTS (
                        SELECT 1 FROM notificacao n
                        WHERE n.contrato_id = c.contrato_id AND n.tipo = 'pagamento_pendente'
                    ) AS denuncia_enviada
             FROM contrato c
             JOIN pais p ON p.codigo_pais = c.codigo_pais
             JOIN baba b ON b.codigo_baba = c.codigo_baba
             WHERE ${filtro} = ?
             ORDER BY c.data_inicio DESC, c.contrato_id DESC`,
            [perfil.codigo_perfil]
        );
        return anexarHorariosJson(contratos, 'pagamento de contrato').map((contrato) => ({
            ...contrato,
            ...calcularCustoContrato(contrato)
        }));
    },

    marcarContratoPago: async (contratoId, codigoPais, pagoEm) => {
        const resultado = await executar(
            `UPDATE contrato SET pagamento_status = 'Pago', pago_em = ?
             WHERE contrato_id = ? AND codigo_pais = ? AND pagamento_status = 'Pendente'`,
            [pagoEm, contratoId, codigoPais]
        );
        if (resultado.changes) return true;
        return obter(
            'SELECT contrato_id, pagamento_status FROM contrato WHERE contrato_id = ? AND codigo_pais = ?',
            [contratoId, codigoPais]
        );
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

    finalizarEntrevista: async (entrevistaId, codigoPais) => {
        const resultado = await executar(
            `UPDATE entrevista SET status = 'Concluída'
             WHERE entrevista_id = ? AND codigo_pais = ? AND status = 'Agendada'`,
            [entrevistaId, codigoPais]
        );
        if (resultado.changes) return true;
        return obter(
            'SELECT entrevista_id, status FROM entrevista WHERE entrevista_id = ? AND codigo_pais = ?',
            [entrevistaId, codigoPais]
        );
    },

    avaliarEntrevista: (entrevistaId, codigoBaba, nota, comentario, motivos) => transacionar(async () => {
        const entrevista = await obter(
            `SELECT entrevista_id, codigo_pais, codigo_baba FROM entrevista
             WHERE entrevista_id = ? AND codigo_baba = ? AND status = 'Concluída'`,
            [entrevistaId, codigoBaba]
        );
        if (!entrevista) return null;
        const resultado = await executar(
            `INSERT INTO avaliacao_entrevista
             (entrevista_id, avaliador_tipo, codigo_pais, codigo_baba, nota, comentario, motivos_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (entrevista_id, avaliador_tipo) DO NOTHING`,
            [
                entrevistaId,
                'baba',
                null,
                codigoBaba,
                nota,
                comentario,
                JSON.stringify(motivos)
            ]
        );
        if (!resultado.changes) return false;
        return obter(
            `SELECT avaliacao_id, entrevista_id, nota, comentario, motivos_json, criada_em
             FROM avaliacao_entrevista
             WHERE entrevista_id = ? AND avaliador_tipo = ?`,
            [entrevistaId, 'baba']
        ).then((avaliacao) => ({ ...avaliacao, motivos: JSON.parse(avaliacao.motivos_json) }));
    }),

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
             (codigo_pais, codigo_baba, data_inicio, data_fim, horarios_json, tarifa_hora, mensagem)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                dados.codigo_pais, dados.codigo_baba, dados.data_inicio, dados.data_fim,
                JSON.stringify(dados.horarios), dados.tarifa_hora, dados.mensagem
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
             (codigo_pais, codigo_baba, data_inicio, data_fim, horarios_json, tarifa_hora, mensagem)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                solicitacao.codigo_pais, solicitacao.codigo_baba, solicitacao.data_inicio,
                solicitacao.data_fim, solicitacao.horarios_json, solicitacao.tarifa_hora, solicitacao.mensagem
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
        "SELECT codigo_baba, tarifa_hora, tarifa_negociavel FROM baba WHERE codigo_baba = ? AND status_cadastro = 'Ativa' AND diploma_status = 'Aprovada'",
        [codigoBaba]
    )
};

module.exports = Agendamentos;
