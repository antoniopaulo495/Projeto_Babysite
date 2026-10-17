const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const gerarCodigoUsuario = require('../utils/CodigoUsuario');

const dbPath = path.resolve(process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite'));
const schemaPath = path.resolve(__dirname, 'schema.sql');
const seedersPath = path.resolve(__dirname, 'seeders.sql');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco SQLite:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        
        // Ativa chaves estrangeiras
        db.run('PRAGMA foreign_keys = ON;');

        // 1. Executa o Schema (Criação das Tabelas)
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schemaSql, (schemaErr) => {
            if (schemaErr) {
                console.error('Erro ao inicializar schema:', schemaErr.message);
            } else {
                console.log('Tabelas criadas/verificadas com sucesso.');

                migrarPerfilBaba()
                    .then(() => migrarCodigosUsuario())
                    .then(() => migrarSolicitacoesContrato())
                    .then(() => migrarMotivosAvaliacao())
                    .then(() => {
                        // 2. Executa o Seeders (Inserção dos Dados de Teste)
                        const seedersSql = fs.readFileSync(seedersPath, 'utf8');
                        db.exec(seedersSql, (seedErr) => {
                            if (seedErr) {
                                console.error('Erro ao popular dados iniciais:', seedErr.message);
                            } else {
                                console.log('Dados de teste do seeders.sql inseridos com sucesso!');
                            }
                        });
                    })
                    .catch((migracaoErr) => {
                        console.error('Erro ao migrar banco de dados:', migracaoErr.message);
                    });
            }
        });
    }
});

function executar(sql, valores = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, valores, (erro) => erro ? reject(erro) : resolve());
    });
}

function consultar(sql, valores = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, valores, (erro, rows) => erro ? reject(erro) : resolve(rows));
    });
}

async function migrarCodigosUsuario() {
    const usuarios = await consultar('SELECT usuario_codigo FROM usuario');
    const codigosExistentes = new Set(usuarios.map(({ usuario_codigo }) => usuario_codigo));
    const migracoes = usuarios
        .filter(({ usuario_codigo }) => !/^\d{12}$/.test(usuario_codigo))
        .map(({ usuario_codigo }) => {
            let novoCodigo;
            do {
                novoCodigo = gerarCodigoUsuario();
            } while (codigosExistentes.has(novoCodigo));
            codigosExistentes.add(novoCodigo);
            return { antigo: usuario_codigo, novo: novoCodigo };
        });

    if (!migracoes.length) return;

    await executar('PRAGMA defer_foreign_keys = ON');
    await executar('BEGIN IMMEDIATE');
    try {
        for (const { antigo, novo } of migracoes) {
            await executar('UPDATE usuario SET usuario_codigo = ? WHERE usuario_codigo = ?', [novo, antigo]);
            for (const tabela of ['pais', 'baba', 'credencial', 'administrador']) {
                await executar(`UPDATE ${tabela} SET usuario_codigo = ? WHERE usuario_codigo = ?`, [novo, antigo]);
            }
        }
        await executar('COMMIT');
    } catch (erroMigracao) {
        await executar('ROLLBACK').catch(() => {});
        throw erroMigracao;
    }
}

async function migrarPerfilBaba() {
    const colunas = await new Promise((resolve, reject) => {
        db.all('PRAGMA table_info(baba)', [], (erro, rows) => erro ? reject(erro) : resolve(rows));
    });
    const existentes = new Set(colunas.map(({ name }) => name));
    const novasColunas = [
        ['tarifa_hora', 'REAL'],
        ['estado', 'CHAR(2)'],
        ['municipio', 'VARCHAR(100)']
    ];
    for (const [nome, tipo] of novasColunas) {
        if (!existentes.has(nome)) {
            await executar(`ALTER TABLE baba ADD COLUMN ${nome} ${tipo}`);
        }
    }
    for (const nome of ['cep', 'logradouro', 'numero', 'complemento', 'bairro']) {
        if (existentes.has(nome)) {
            await executar(`ALTER TABLE baba DROP COLUMN ${nome}`);
        }
    }
}

async function existeTabela(nome) {
    const resultado = await consultar(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        [nome]
    );
    return resultado.length > 0;
}

async function migrarSolicitacoesContrato() {
    const colunasSolicitacao = await new Promise((resolve, reject) => {
        db.all('PRAGMA table_info(solicitacao_contrato)', [], (erro, rows) => erro ? reject(erro) : resolve(rows));
    });
    const colunasContrato = await new Promise((resolve, reject) => {
        db.all('PRAGMA table_info(contrato)', [], (erro, rows) => erro ? reject(erro) : resolve(rows));
    });
    const existentesSolicitacao = new Set(colunasSolicitacao.map(({ name }) => name));
    const existentesContrato = new Set(colunasContrato.map(({ name }) => name));
    const temTabelaHorarios = await existeTabela('solicitacao_contrato_horario');
    const temTabelaHorariosContrato = await existeTabela('contrato_horario');
    if (existentesSolicitacao.has('data_fim')
        && existentesSolicitacao.has('horarios_json')
        && existentesContrato.has('data_fim')
        && existentesContrato.has('horarios_json')
        && !temTabelaHorarios
        && !temTabelaHorariosContrato) return;

    await executar('BEGIN IMMEDIATE');
    try {
        if (!existentesSolicitacao.has('data_fim')) {
            await executar('ALTER TABLE solicitacao_contrato ADD COLUMN data_fim DATE');
        }
        if (!existentesSolicitacao.has('horarios_json')) {
            await executar("ALTER TABLE solicitacao_contrato ADD COLUMN horarios_json TEXT NOT NULL DEFAULT '[]'");
        }
        if (!existentesContrato.has('data_fim')) {
            await executar('ALTER TABLE contrato ADD COLUMN data_fim DATE');
        }
        if (!existentesContrato.has('horarios_json')) {
            await executar("ALTER TABLE contrato ADD COLUMN horarios_json TEXT NOT NULL DEFAULT '[]'");
        }
        if (temTabelaHorarios) {
            const solicitacoes = await consultar('SELECT solicitacao_id FROM solicitacao_contrato');
            for (const { solicitacao_id } of solicitacoes) {
                const horarios = await consultar(
                    `SELECT dia_semana, hora_inicio, hora_fim
                     FROM solicitacao_contrato_horario
                     WHERE solicitacao_id = ?
                     ORDER BY CASE dia_semana
                         WHEN 'segunda' THEN 1 WHEN 'terca' THEN 2 WHEN 'quarta' THEN 3
                         WHEN 'quinta' THEN 4 WHEN 'sexta' THEN 5 WHEN 'sabado' THEN 6 END`,
                    [solicitacao_id]
                );
                await executar(
                    'UPDATE solicitacao_contrato SET horarios_json = ? WHERE solicitacao_id = ?',
                    [JSON.stringify(horarios), solicitacao_id]
                );
            }
            await executar('DROP TABLE solicitacao_contrato_horario');
        }
        if (temTabelaHorariosContrato) {
            const contratos = await consultar('SELECT contrato_id FROM contrato');
            for (const { contrato_id } of contratos) {
                const horarios = await consultar(
                    `SELECT dia_semana, hora_inicio, hora_fim
                     FROM contrato_horario
                     WHERE contrato_id = ?
                     ORDER BY CASE dia_semana
                         WHEN 'segunda' THEN 1 WHEN 'terca' THEN 2 WHEN 'quarta' THEN 3
                         WHEN 'quinta' THEN 4 WHEN 'sexta' THEN 5 WHEN 'sabado' THEN 6 END`,
                    [contrato_id]
                );
                await executar(
                    'UPDATE contrato SET horarios_json = ? WHERE contrato_id = ?',
                    [JSON.stringify(horarios), contrato_id]
                );
            }
            await executar('DROP TABLE contrato_horario');
        }
        await executar('COMMIT');
    } catch (erroMigracao) {
        await executar('ROLLBACK').catch(() => {});
        throw erroMigracao;
    }
}

async function migrarMotivosAvaliacao() {
    const colunas = await new Promise((resolve, reject) => {
        db.all('PRAGMA table_info(avaliacao_contrato)', [], (erro, rows) => erro ? reject(erro) : resolve(rows));
    });
    const existentes = new Set(colunas.map(({ name }) => name));
    const temTabelaMotivos = await existeTabela('avaliacao_motivo');
    if (existentes.has('motivos_json') && !temTabelaMotivos) return;

    await executar('BEGIN IMMEDIATE');
    try {
        if (!existentes.has('motivos_json')) {
            await executar("ALTER TABLE avaliacao_contrato ADD COLUMN motivos_json TEXT NOT NULL DEFAULT '[]'");
        }
        if (temTabelaMotivos) {
            const avaliacoes = await consultar('SELECT avaliacao_id FROM avaliacao_contrato');
            for (const { avaliacao_id } of avaliacoes) {
                const linhas = await consultar(
                    'SELECT motivo FROM avaliacao_motivo WHERE avaliacao_id = ? ORDER BY motivo',
                    [avaliacao_id]
                );
                await executar(
                    'UPDATE avaliacao_contrato SET motivos_json = ? WHERE avaliacao_id = ?',
                    [JSON.stringify(linhas.map(({ motivo }) => motivo)), avaliacao_id]
                );
            }
            await executar('DROP TABLE avaliacao_motivo');
        }
        await executar('COMMIT');
    } catch (erroMigracao) {
        await executar('ROLLBACK').catch(() => {});
        throw erroMigracao;
    }
}

module.exports = db;