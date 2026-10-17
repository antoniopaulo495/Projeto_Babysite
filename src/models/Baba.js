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

const Baba = {
    // Listar todas as babás ativas para o site público
    listarAtivas: async () => {
        const sql = `SELECT b.codigo_baba, u.nome, b.foto, b.status_cadastro,
                            b.tarifa_hora, b.estado, b.municipio
                     FROM baba AS b 
                     INNER JOIN usuario AS u ON b.usuario_codigo = u.usuario_codigo 
                     WHERE b.status_cadastro = 'Ativa' 
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
            disponibilidade: horariosPorBaba.get(baba.codigo_baba) || []
        }));
    },

    buscarPerfilPublico: (codigo_baba, callback) => {
        const sql = `SELECT b.codigo_baba, u.nome, b.foto, b.status_cadastro,
                            b.tarifa_hora, b.estado, b.municipio
                     FROM baba AS b
                     INNER JOIN usuario AS u ON b.usuario_codigo = u.usuario_codigo
                     WHERE b.codigo_baba = ? AND b.status_cadastro = 'Ativa'`;
        db.get(sql, [codigo_baba], callback);
    },

    buscarMeuPerfil: (codigo_baba) => new Promise((resolve, reject) => {
        db.get(
            `SELECT codigo_baba, tarifa_hora, estado, municipio
             FROM baba WHERE codigo_baba = ?`,
            [codigo_baba],
            (erro, perfil) => erro ? reject(erro) : resolve(perfil)
        );
    }),

    atualizarPerfilPublico: (codigo_baba, dados) => executar(
        `UPDATE baba SET tarifa_hora = ?, estado = ?, municipio = ?
         WHERE codigo_baba = ?`,
        [dados.tarifa_hora, dados.estado, dados.municipio, codigo_baba]
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
    atualizarStatus: (codigo_baba, novoStatus, callback) => {
        const sql = 'UPDATE baba SET status_cadastro = ? WHERE codigo_baba = ?';
        db.run(sql, [novoStatus, codigo_baba], callback);
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