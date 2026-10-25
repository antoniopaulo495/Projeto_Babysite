const db = require('../database/connection');

function executar(sql, valores = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, valores, function (erro) {
            if (erro) {
                reject(erro);
                return;
            }
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

const intervaloCertidaoMs = 1000;
const formasPagamentoValidas = ['pix', 'dinheiro', 'cartao'];

function lerFormasPagamento(valor) {
    const formas = JSON.parse(valor || '[]');
    if (!Array.isArray(formas) || formas.some((forma) => !formasPagamentoValidas.includes(forma))) {
        throw new Error('O perfil contém formas de pagamento inválidas.');
    }
    return formas;
}

function adicionarUmSegundo(dataBase) {
    return new Date(new Date(dataBase).valueOf() + intervaloCertidaoMs);
}

function mesmasTarifas(atual, nova) {
    if (atual === null || atual === undefined || nova === null || nova === undefined) {
        return (atual === null || atual === undefined) && (nova === null || nova === undefined);
    }
    return Number(atual) === Number(nova);
}

const Baba = {
    // Listar todas as babás ativas para o site público
    listarAtivas: async () => {
        const sql = `SELECT b.codigo_baba, u.nome,
                    CASE WHEN b.foto IS NOT NULL THEN 1 ELSE 0 END AS foto_disponivel,
                    b.status_cadastro,
                    b.tarifa_hora, b.tarifa_negociavel, b.formas_pagamento, b.estado, b.municipio
                     FROM baba AS b 
                     INNER JOIN usuario AS u ON b.usuario_codigo = u.usuario_codigo 
                     WHERE b.status_cadastro = 'Ativa'
                       AND b.diploma_status = 'Aprovada'
                     ORDER BY u.nome ASC`;
        const babas = await consultar(sql);
        if (!babas.length) return babas;

        const disponibilidade = await consultar(
            `SELECT codigo_baba, dia_semana, hora_inicio, hora_fim
             FROM baba_disponibilidade
             WHERE codigo_baba IN (${babas.map(() => '?').join(', ')})
               AND dia_semana IN ('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado')
             ORDER BY CASE dia_semana
                 WHEN 'segunda' THEN 1 WHEN 'terca' THEN 2 WHEN 'quarta' THEN 3
                 WHEN 'quinta' THEN 4 WHEN 'sexta' THEN 5 WHEN 'sabado' THEN 6 END`,
            babas.map(({ codigo_baba }) => codigo_baba)
        );
        const horariosPorBaba = new Map();
        for (const horario of disponibilidade) {
            const horarios = horariosPorBaba.get(horario.codigo_baba) || [];
            horarios.push({
                dia_semana: horario.dia_semana,
                hora_inicio: horario.hora_inicio,
                hora_fim: horario.hora_fim
            });
            horariosPorBaba.set(horario.codigo_baba, horarios);
        }
        return babas.map((baba) => ({
            ...baba,
            tarifa_negociavel: Boolean(baba.tarifa_negociavel),
            formas_pagamento: lerFormasPagamento(baba.formas_pagamento),
            disponibilidade: horariosPorBaba.get(baba.codigo_baba) || []
        }));
    },

    buscarPerfilPublico: (codigo_baba, callback) => {
        const sql = `SELECT b.codigo_baba, u.nome,
                    CASE WHEN b.foto IS NOT NULL THEN 1 ELSE 0 END AS foto_disponivel,
                    b.status_cadastro,
                    b.tarifa_hora, b.tarifa_negociavel, b.formas_pagamento, b.estado, b.municipio
                     FROM baba AS b
                     INNER JOIN usuario AS u ON b.usuario_codigo = u.usuario_codigo
                     WHERE b.codigo_baba = ? AND b.status_cadastro = 'Ativa'
                       AND b.diploma_status = 'Aprovada'`;
        db.get(sql, [codigo_baba], (erro, perfil) => {
            if (erro || !perfil) return callback(erro, perfil);
            try {
                perfil.tarifa_negociavel = Boolean(perfil.tarifa_negociavel);
                perfil.formas_pagamento = lerFormasPagamento(perfil.formas_pagamento);
                callback(null, perfil);
            } catch (erroPagamento) {
                callback(erroPagamento);
            }
        });
    },

    buscarMeuPerfil: (codigo_baba) => new Promise((resolve, reject) => {
        db.get(
            `SELECT codigo_baba, tarifa_hora, tarifa_negociavel, formas_pagamento,
                    tarifa_proxima_alteracao_em, estado, municipio,
                    foto, foto_mimetype, foto_atualizada_em,
                    certidao_caminho, certidao_nome, certidao_atualizada_em, certidao_status,
                    diploma_caminho, diploma_nome, diploma_atualizado_em, diploma_status
             FROM baba WHERE codigo_baba = ?`,
            [codigo_baba],
            (erro, perfil) => {
                if (erro || !perfil) return erro ? reject(erro) : resolve(perfil);
                try {
                    perfil.tarifa_negociavel = Boolean(perfil.tarifa_negociavel);
                    perfil.formas_pagamento = lerFormasPagamento(perfil.formas_pagamento);
                    resolve(perfil);
                } catch (erroPagamento) {
                    reject(erroPagamento);
                }
            }
        );
    }),

    buscarAcesso: (codigo_baba) => obter(
        'SELECT status_cadastro, desativada_ate, desativada_dias, diploma_status FROM baba WHERE codigo_baba = ?',
        [codigo_baba]
    ),

    reativarConta: async (codigo_baba, agora = new Date().toISOString()) => {
        const acesso = await Baba.buscarAcesso(codigo_baba);
        if (!acesso) return { naoEncontrada: true };
        if (acesso.status_cadastro !== 'Desativada') return { indisponivel: true };
        if (!acesso.desativada_ate || Date.parse(acesso.desativada_ate) > Date.parse(agora)) {
            return { prazoNaoEncerrado: true, desativadaAte: acesso.desativada_ate };
        }
        const resultado = await executar(
            `UPDATE baba
             SET status_cadastro = 'Ativa', desativada_ate = NULL, desativada_dias = NULL
             WHERE codigo_baba = ? AND status_cadastro = 'Desativada' AND desativada_ate <= ?`,
            [codigo_baba, agora]
        );
        return resultado.changes ? { reativada: true } : { indisponivel: true };
    },

    atualizarPerfilPublico: async (codigo_baba, dados) => {
        const perfilAtual = await new Promise((resolve, reject) => {
            db.get(
                'SELECT tarifa_hora, tarifa_negociavel, tarifa_proxima_alteracao_em FROM baba WHERE codigo_baba = ?',
                [codigo_baba],
                (erro, perfil) => erro ? reject(erro) : resolve(perfil)
            );
        });
        if (!perfilAtual) return { naoEncontrado: true };

        const alterarTarifa = Object.hasOwn(dados, 'tarifa_hora');
        const alterarNegociavel = Object.hasOwn(dados, 'tarifa_negociavel') || alterarTarifa;
        const tarifaNegociavel = dados.tarifa_negociavel === true;
        const tarifaMudou = (alterarTarifa && !mesmasTarifas(perfilAtual.tarifa_hora, dados.tarifa_hora))
            || (alterarNegociavel && Boolean(perfilAtual.tarifa_negociavel) !== tarifaNegociavel);
        const agora = new Date();
        const proximaAlteracao = perfilAtual.tarifa_proxima_alteracao_em
            ? new Date(perfilAtual.tarifa_proxima_alteracao_em)
            : null;
        if (tarifaMudou && proximaAlteracao && proximaAlteracao > agora) {
            return {
                tarifaBloqueada: true,
                proximaAlteracao: perfilAtual.tarifa_proxima_alteracao_em
            };
        }

        const campos = [];
        const valores = [];
        if (alterarTarifa) {
            campos.push('tarifa_hora = ?');
            valores.push(dados.tarifa_hora);
        }
        if (alterarNegociavel) {
            campos.push('tarifa_negociavel = ?');
            valores.push(tarifaNegociavel ? 1 : 0);
        }
        if (tarifaMudou) {
            campos.push('tarifa_proxima_alteracao_em = ?');
            valores.push(adicionarUmSegundo(agora).toISOString());
        }
        if (Object.hasOwn(dados, 'formas_pagamento')) {
            campos.push('formas_pagamento = ?');
            valores.push(JSON.stringify(dados.formas_pagamento));
        }
        for (const campo of ['estado', 'municipio']) {
            if (Object.hasOwn(dados, campo)) {
                campos.push(`${campo} = ?`);
                valores.push(dados[campo]);
            }
        }
        if (!campos.length) return { atualizado: true };

        const condicaoTarifa = tarifaMudou
            ? ' AND (tarifa_proxima_alteracao_em IS NULL OR tarifa_proxima_alteracao_em <= ?)'
            : '';
        valores.push(codigo_baba);
        if (tarifaMudou) valores.push(agora.toISOString());
        const resultado = await executar(
            `UPDATE baba SET ${campos.join(', ')} WHERE codigo_baba = ?${condicaoTarifa}`,
            valores
        );
        if (resultado.changes) return { atualizado: true };

        const perfilDepois = await new Promise((resolve, reject) => {
            db.get(
                'SELECT tarifa_hora, tarifa_negociavel, tarifa_proxima_alteracao_em FROM baba WHERE codigo_baba = ?',
                [codigo_baba],
                (erro, perfil) => erro ? reject(erro) : resolve(perfil)
            );
        });
        if (!perfilDepois) return { naoEncontrado: true };
        if (tarifaMudou
            && mesmasTarifas(perfilDepois.tarifa_hora, dados.tarifa_hora)
            && Boolean(perfilDepois.tarifa_negociavel) === tarifaNegociavel) {
            return { atualizado: true };
        }
        return {
            tarifaBloqueada: true,
            proximaAlteracao: perfilDepois.tarifa_proxima_alteracao_em
        };
    },

    atualizarFoto: (codigo_baba, caminho, mimetype, atualizadaEm) => executar(
        `UPDATE baba SET foto = ?, foto_mimetype = ?, foto_atualizada_em = ?
         WHERE codigo_baba = ?`,
        [caminho, mimetype, atualizadaEm, codigo_baba]
    ),

    atualizarCertidao: async (codigo_baba, caminho, nome, atualizadaEm) => {
        const limiteAtualizacao = new Date(Date.parse(atualizadaEm) - intervaloCertidaoMs).toISOString();
        const resultado = await executar(
                        `UPDATE baba SET certidao_caminho = ?, certidao_nome = ?, certidao_atualizada_em = ?,
                                                         certidao_status = 'Pendente'
             WHERE codigo_baba = ?
               AND (certidao_atualizada_em IS NULL OR certidao_atualizada_em <= ?)`,
            [caminho, nome, atualizadaEm, codigo_baba, limiteAtualizacao]
        );
        if (resultado.changes) return { atualizado: true };
        const perfil = await obter(
            'SELECT certidao_atualizada_em FROM baba WHERE codigo_baba = ?',
            [codigo_baba]
        );
        if (!perfil) return { naoEncontrado: true };
        return { bloqueada: true, proximaAtualizacao: adicionarUmSegundo(perfil.certidao_atualizada_em).toISOString() };
    },

    removerCertidao: async (codigo_baba, removidaEm) => {
        const limiteAtualizacao = new Date(Date.parse(removidaEm) - intervaloCertidaoMs).toISOString();
        const resultado = await executar(
            `UPDATE baba
                         SET certidao_caminho = NULL, certidao_nome = NULL,
                                 certidao_atualizada_em = ?, certidao_status = 'Removida'
             WHERE codigo_baba = ? AND certidao_caminho IS NOT NULL
               AND (certidao_atualizada_em IS NULL OR certidao_atualizada_em <= ?)`,
                        [removidaEm, codigo_baba, limiteAtualizacao]
        );
        if (resultado.changes) return { removida: true };
        const perfil = await obter(
            'SELECT certidao_caminho, certidao_atualizada_em FROM baba WHERE codigo_baba = ?',
            [codigo_baba]
        );
        if (!perfil) return { naoEncontrado: true };
        if (!perfil.certidao_caminho) return { semCertidao: true };
        return {
            bloqueada: true,
            proximaAtualizacao: adicionarUmSegundo(perfil.certidao_atualizada_em).toISOString()
        };
    },

    atualizarStatusCertidao: (codigo_baba, status) => executar(
        `UPDATE baba SET certidao_status = ?
         WHERE codigo_baba = ? AND certidao_caminho IS NOT NULL`,
        [status, codigo_baba]
    ),

    atualizarDiploma: (codigo_baba, caminho, nome, atualizadaEm) => executar(
        `UPDATE baba SET diploma_caminho = ?, diploma_nome = ?, diploma_atualizado_em = ?,
                         diploma_status = 'Pendente'
         WHERE codigo_baba = ?`,
        [caminho, nome, atualizadaEm, codigo_baba]
    ),

    atualizarStatusDiploma: (codigo_baba, status) => executar(
        `UPDATE baba SET diploma_status = ?
         WHERE codigo_baba = ? AND diploma_caminho IS NOT NULL`,
        [status, codigo_baba]
    ),

    buscarPorCodigo: (codigo_baba, callback) => {
        db.get('SELECT codigo_baba FROM baba WHERE codigo_baba = ?', [codigo_baba], callback);
    },

    listarDisponibilidade: (codigo_baba) => consultar(
        `SELECT dia_semana, hora_inicio, hora_fim
         FROM baba_disponibilidade
         WHERE codigo_baba = ?
           AND dia_semana IN ('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado')
         ORDER BY CASE dia_semana
             WHEN 'segunda' THEN 1 WHEN 'terca' THEN 2 WHEN 'quarta' THEN 3
             WHEN 'quinta' THEN 4 WHEN 'sexta' THEN 5 WHEN 'sabado' THEN 6 END`,
        [codigo_baba]
    ),

    salvarDisponibilidade: async (codigo_baba, disponibilidade) => {
        await executar('BEGIN IMMEDIATE');
        try {
            await executar('DELETE FROM baba_disponibilidade WHERE codigo_baba = ?', [codigo_baba]);
            for (const horario of disponibilidade) {
                await executar(
                    `INSERT INTO baba_disponibilidade (codigo_baba, dia_semana, hora_inicio, hora_fim)
                     VALUES (?, ?, ?, ?)`,
                    [codigo_baba, horario.dia_semana, horario.hora_inicio, horario.hora_fim]
                );
            }
            await executar('COMMIT');
        } catch (erro) {
            await executar('ROLLBACK').catch(() => {});
            throw erro;
        }
    },

    // Atualizar status da babá (usado pelo Módulo Admin)
    atualizarStatus: (codigo_baba, novoStatus, desativadaAte, desativadaDias, callback) => {
        const sql = `UPDATE baba
                     SET status_cadastro = ?, desativada_ate = ?, desativada_dias = ?
                     WHERE codigo_baba = ?`;
        db.run(sql, [novoStatus, desativadaAte, desativadaDias, codigo_baba], callback);
    },

    excluirPorCodigo: async (codigo_baba) => {
        await executar('BEGIN IMMEDIATE');
        try {
            const baba = await new Promise((resolve, reject) => {
                db.get('SELECT usuario_codigo FROM baba WHERE codigo_baba = ?', [codigo_baba], (erro, row) => {
                    if (erro) return reject(erro);
                    resolve(row);
                });
            });
            if (!baba) {
                await executar('COMMIT');
                return false;
            }

            await executar('DELETE FROM baba WHERE codigo_baba = ?', [codigo_baba]);
            await executar('DELETE FROM credencial WHERE usuario_codigo = ?', [baba.usuario_codigo]);
            await executar('DELETE FROM usuario WHERE usuario_codigo = ?', [baba.usuario_codigo]);
            await executar('COMMIT');
            return true;
        } catch (erro) {
            await executar('ROLLBACK').catch(() => {});
            throw erro;
        }
    }
};

module.exports = Baba;