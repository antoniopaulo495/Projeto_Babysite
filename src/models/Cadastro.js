const { randomInt } = require('crypto');
const db = require('../database/connection');
const gerarCodigoUsuario = require('../utils/CodigoUsuario');

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

const Cadastro = {
    criar: async (dados) => {
        const usuarioCodigo = gerarCodigoUsuario();
        const perfilCodigo = `${dados.tipo_usuario === 'baba' ? 'BAB' : 'PAI'}${randomInt(0, 1000000000).toString().padStart(9, '0')}`;

        await executar('BEGIN IMMEDIATE');
        try {
            await executar(
                `INSERT INTO usuario (usuario_codigo, cpf, email_1, telefone, nome)
                 VALUES (?, ?, ?, ?, ?)`,
                [usuarioCodigo, dados.cpf, dados.email, dados.telefone, dados.nome]
            );

            if (dados.tipo_usuario === 'baba') {
                await executar(
                    `INSERT INTO baba (
                         codigo_baba, cpf, email_1, telefone, nome, usuario_codigo,
                         tarifa_hora, estado, municipio
                     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        perfilCodigo, dados.cpf, dados.email, dados.telefone, dados.nome, usuarioCodigo,
                        dados.tarifa_hora, dados.estado, dados.municipio
                    ]
                );
                for (const horario of dados.disponibilidade) {
                    await executar(
                        `INSERT INTO baba_disponibilidade (codigo_baba, dia_semana, hora_inicio, hora_fim)
                         VALUES (?, ?, ?, ?)`,
                        [perfilCodigo, horario.dia_semana, horario.hora_inicio, horario.hora_fim]
                    );
                }
            } else {
                await executar(
                    `INSERT INTO pais (codigo_pais, cpf, email_1, telefone, nome, usuario_codigo)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [perfilCodigo, dados.cpf, dados.email, dados.telefone, dados.nome, usuarioCodigo]
                );
            }

            await executar(
                'INSERT INTO credencial (usuario_codigo, senha_hash) VALUES (?, ?)',
                [usuarioCodigo, dados.senhaHash]
            );
            await executar('COMMIT');
            return { usuarioCodigo, perfilCodigo };
        } catch (erro) {
            await executar('ROLLBACK').catch(() => {});
            throw erro;
        }
    }
};

module.exports = Cadastro;