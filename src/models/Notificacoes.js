const db = require('../database/connection');
const camposObrigatorios = {
    tarifa_hora: {
        titulo: 'Defina uma tarifa fixa',
        mensagem: 'Informe sua tarifa por hora para que as famílias possam enviar propostas de contratação.'
    },
    disponibilidade: {
        titulo: 'Cadastre seus horários',
        mensagem: 'Informe os dias e horários em que você está disponível para trabalhar.'
    },
    localizacao: {
        titulo: 'Complete sua localização',
        mensagem: 'Informe seu estado e município para que as famílias encontrem seu perfil na busca.'
    },
    formas_pagamento: {
        titulo: 'Informe como você recebe',
        mensagem: 'Selecione ao menos uma forma de pagamento aceita no seu perfil.'
    },
    foto: {
        titulo: 'Adicione uma foto ao perfil',
        mensagem: 'Uma foto ajuda as famílias a reconhecer e conhecer seu perfil profissional.'
    },
    certidao: {
        titulo: 'Envie sua certidão',
        mensagem: 'Envie sua certidão de antecedentes criminais para análise da administração.'
    },
    diploma: {
        titulo: 'Envie novamente seu diploma',
        mensagem: 'O diploma de cuidadora infantil é obrigatório. Envie um PDF válido para análise da administração.'
    }
};

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

const Notificacoes = {
    listar: async (perfil) => {
        if (perfil.tipo_usuario === 'baba') await Notificacoes.sincronizarDadosFaltantes(perfil.codigo_perfil);
        return consultar(
            `SELECT notificacao_id, tipo, contrato_id, referencia, titulo, mensagem, criada_em, lida_em
             FROM notificacao
             WHERE destinatario_tipo = ? AND destinatario_codigo = ?
             ORDER BY criada_em DESC, notificacao_id DESC`,
            [perfil.tipo_usuario, perfil.codigo_perfil]
        );
    },

    sincronizarDadosFaltantes: async (codigoBaba) => {
        const perfil = await obter(
            `SELECT b.tarifa_hora, b.tarifa_negociavel, b.formas_pagamento, b.estado, b.municipio,
                    b.foto, b.certidao_status, b.diploma_caminho, b.diploma_status,
                    EXISTS (
                        SELECT 1 FROM baba_disponibilidade d
                        WHERE d.codigo_baba = b.codigo_baba
                    ) AS possui_disponibilidade
             FROM baba b WHERE b.codigo_baba = ?`,
            [codigoBaba]
        );
        if (!perfil) return;

        let formasPagamento;
        try {
            formasPagamento = JSON.parse(perfil.formas_pagamento || '[]');
        } catch (erro) {
            console.error(`Não foi possível ler as formas de pagamento da babá ${codigoBaba}.`, erro);
            formasPagamento = [];
        }

        const pendencias = [];
        if (perfil.tarifa_negociavel || !Number.isFinite(Number(perfil.tarifa_hora))
            || Number(perfil.tarifa_hora) < 25 || Number(perfil.tarifa_hora) > 50) {
            pendencias.push('tarifa_hora');
        }
        if (!perfil.possui_disponibilidade) pendencias.push('disponibilidade');
        if (!perfil.estado || !perfil.municipio) pendencias.push('localizacao');
        if (!Array.isArray(formasPagamento) || !formasPagamento.length) pendencias.push('formas_pagamento');
        if (!perfil.foto) pendencias.push('foto');
        if (['Não enviada', 'Removida', 'Recusada'].includes(perfil.certidao_status)) {
            pendencias.push('certidao');
        }
        if (!perfil.diploma_caminho
            || ['Não enviado', 'Não enviada', 'Recusada'].includes(perfil.diploma_status)) {
            pendencias.push('diploma');
        }

        for (const referencia of pendencias) {
            const { titulo, mensagem } = camposObrigatorios[referencia];
            await executar(
                `INSERT INTO notificacao
                 (destinatario_tipo, destinatario_codigo, tipo, contrato_id, referencia, titulo, mensagem)
                 VALUES ('baba', ?, 'perfil_incompleto', NULL, ?, ?, ?)
                 ON CONFLICT (tipo, destinatario_tipo, destinatario_codigo, referencia)
                 DO UPDATE SET
                    titulo = excluded.titulo,
                    mensagem = excluded.mensagem,
                    criada_em = CASE WHEN notificacao.titulo != excluded.titulo
                        THEN CURRENT_TIMESTAMP ELSE notificacao.criada_em END,
                    lida_em = CASE WHEN notificacao.titulo != excluded.titulo
                        THEN NULL ELSE notificacao.lida_em END`,
                [codigoBaba, `perfil:${referencia}`, titulo, mensagem]
            );
        }

        const avisosAbertos = await consultar(
            `SELECT referencia FROM notificacao
             WHERE destinatario_tipo = 'baba' AND destinatario_codigo = ?
               AND tipo = 'perfil_incompleto'`,
            [codigoBaba]
        );
        for (const { referencia } of avisosAbertos) {
            const campo = referencia.replace(/^perfil:/, '');
            if (pendencias.includes(campo)) continue;
            await executar(
                `UPDATE notificacao
                 SET titulo = 'Informação de perfil atualizada',
                     mensagem = ?,
                     criada_em = CURRENT_TIMESTAMP,
                     lida_em = CURRENT_TIMESTAMP
                 WHERE destinatario_tipo = 'baba' AND destinatario_codigo = ?
                   AND tipo = 'perfil_incompleto' AND referencia = ?
                   AND titulo != 'Informação de perfil atualizada'`,
                [`Você completou esta informação do seu perfil.`, codigoBaba, referencia]
            );
        }
    },

    denunciarPagamento: async (contratoId, codigoBaba) => {
        const insercao = await executar(
            `INSERT INTO notificacao
             (destinatario_tipo, destinatario_codigo, tipo, contrato_id, referencia, titulo, mensagem)
             SELECT 'pais', c.codigo_pais, 'pagamento_pendente', c.contrato_id,
                    'contrato:' || c.contrato_id,
                    'Aviso de pagamento pendente',
                    b.nome || ' informou que o pagamento do contrato de '
                    || c.data_inicio || ' a ' || c.data_fim || ' ainda não foi registrado.'
             FROM contrato c
             JOIN baba b ON b.codigo_baba = c.codigo_baba
             WHERE c.contrato_id = ? AND c.codigo_baba = ?
               AND c.status = 'Concluído' AND c.pagamento_status = 'Pendente'
             ON CONFLICT DO NOTHING`,
            [contratoId, codigoBaba]
        );
        if (insercao.changes) return 'criada';

        const contrato = await obter(
            `SELECT status, pagamento_status FROM contrato
             WHERE contrato_id = ? AND codigo_baba = ?`,
            [contratoId, codigoBaba]
        );
        if (!contrato) return 'nao_encontrado';
        if (contrato.status !== 'Concluído' || contrato.pagamento_status !== 'Pendente') {
            return 'nao_pendente';
        }
        return 'duplicada';
    },

    marcarLida: async (notificacaoId, perfil) => {
        const resultado = await executar(
            `UPDATE notificacao SET lida_em = CURRENT_TIMESTAMP
             WHERE notificacao_id = ? AND destinatario_tipo = ?
               AND destinatario_codigo = ? AND lida_em IS NULL`,
            [notificacaoId, perfil.tipo_usuario, perfil.codigo_perfil]
        );
        if (resultado.changes) return true;
        return obter(
            `SELECT notificacao_id FROM notificacao
             WHERE notificacao_id = ? AND destinatario_tipo = ? AND destinatario_codigo = ?`,
            [notificacaoId, perfil.tipo_usuario, perfil.codigo_perfil]
        );
    },

    marcarTodasLidas: (perfil) => executar(
        `UPDATE notificacao SET lida_em = CURRENT_TIMESTAMP
         WHERE destinatario_tipo = ? AND destinatario_codigo = ? AND lida_em IS NULL`,
        [perfil.tipo_usuario, perfil.codigo_perfil]
    )
};

module.exports = Notificacoes;
