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
                    .then(() => migrarFormasPagamentoBaba())
                    .then(() => migrarDataCadastroUsuario())
                    .then(() => migrarDesativacaoBaba())
                    .then(() => migrarCodigosUsuario())
                    .then(() => migrarSolicitacoesContrato())
                    .then(() => migrarNotificacoes())
                    .then(() => migrarPagamentosContrato())
                    .then(() => migrarMotivosAvaliacao())
                    .then(() => migrarDiplomaBaba())
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
        ['foto_mimetype', 'VARCHAR(50)'],
        ['foto_atualizada_em', 'TEXT'],
        ['certidao_caminho', 'TEXT'],
        ['certidao_nome', 'VARCHAR(255)'],
        ['certidao_atualizada_em', 'TEXT'],
        ['certidao_status', "TEXT NOT NULL DEFAULT 'Não enviada'"],
        ['tarifa_hora', 'REAL'],
        ['tarifa_proxima_alteracao_em', 'TEXT'],
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

async function migrarFormasPagamentoBaba() {
    const colunas = await new Promise((resolve, reject) => {
        db.all('PRAGMA table_info(baba)', [], (erro, rows) => erro ? reject(erro) : resolve(rows));
    });
    const existentes = new Set(colunas.map(({ name }) => name));
    if (!existentes.has('tarifa_negociavel')) {
        await executar('ALTER TABLE baba ADD COLUMN tarifa_negociavel INTEGER NOT NULL DEFAULT 0');
    }
    if (!existentes.has('formas_pagamento')) {
        await executar("ALTER TABLE baba ADD COLUMN formas_pagamento TEXT NOT NULL DEFAULT '[]'");
    }
}

async function migrarDesativacaoBaba() {
    const colunas = await new Promise((resolve, reject) => {
        db.all('PRAGMA table_info(baba)', [], (erro, rows) => erro ? reject(erro) : resolve(rows));
    });
    const existentes = new Set(colunas.map(({ name }) => name));
    if (!existentes.has('desativada_ate')) {
        await executar('ALTER TABLE baba ADD COLUMN desativada_ate TEXT');
    }
    if (!existentes.has('desativada_dias')) {
        await executar('ALTER TABLE baba ADD COLUMN desativada_dias INTEGER');
    }
}

async function migrarDiplomaBaba() {
    const colunas = await new Promise((resolve, reject) => {
        db.all('PRAGMA table_info(baba)', [], (erro, rows) => erro ? reject(erro) : resolve(rows));
    });
    const existentes = new Set(colunas.map(({ name }) => name));
    const novasColunas = [
        ['diploma_caminho', 'TEXT'],
        ['diploma_nome', 'VARCHAR(255)'],
        ['diploma_atualizado_em', 'TEXT'],
        ['diploma_status', "TEXT NOT NULL DEFAULT 'Pendente'"]
    ];
    for (const [nome, tipo] of novasColunas) {
        if (!existentes.has(nome)) {
            await executar(`ALTER TABLE baba ADD COLUMN ${nome} ${tipo}`);
        }
    }
}

async function migrarDataCadastroUsuario() {
    const colunas = await new Promise((resolve, reject) => {
        db.all('PRAGMA table_info(usuario)', [], (erro, rows) => erro ? reject(erro) : resolve(rows));
    });
    if (colunas.some(({ name }) => name === 'criado_em')) return;
    await executar('ALTER TABLE usuario ADD COLUMN criado_em DATETIME');
    await executar('UPDATE usuario SET criado_em = CURRENT_TIMESTAMP WHERE criado_em IS NULL');
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

async function migrarPagamentosContrato() {
    const colunasSolicitacao = await new Promise((resolve, reject) => {
        db.all('PRAGMA table_info(solicitacao_contrato)', [], (erro, rows) => erro ? reject(erro) : resolve(rows));
    });
    const colunasContrato = await new Promise((resolve, reject) => {
        db.all('PRAGMA table_info(contrato)', [], (erro, rows) => erro ? reject(erro) : resolve(rows));
    });
    const solicitacaoExistentes = new Set(colunasSolicitacao.map(({ name }) => name));
    const contratoExistentes = new Set(colunasContrato.map(({ name }) => name));
    if (!solicitacaoExistentes.has('tarifa_hora')) {
        await executar('ALTER TABLE solicitacao_contrato ADD COLUMN tarifa_hora REAL');
    }
    if (!contratoExistentes.has('tarifa_hora')) {
        await executar('ALTER TABLE contrato ADD COLUMN tarifa_hora REAL');
    }
    if (!contratoExistentes.has('pagamento_status')) {
        await executar("ALTER TABLE contrato ADD COLUMN pagamento_status VARCHAR(20) NOT NULL DEFAULT 'Pendente'");
    }
    if (!contratoExistentes.has('pago_em')) {
        await executar('ALTER TABLE contrato ADD COLUMN pago_em TEXT');
    }
    await executar(
        `UPDATE solicitacao_contrato
         SET tarifa_hora = (SELECT b.tarifa_hora FROM baba b WHERE b.codigo_baba = solicitacao_contrato.codigo_baba)
         WHERE tarifa_hora IS NULL`
    );
    await executar(
        `UPDATE contrato
         SET tarifa_hora = (SELECT b.tarifa_hora FROM baba b WHERE b.codigo_baba = contrato.codigo_baba)
         WHERE tarifa_hora IS NULL`
    );
    await executar(
        `CREATE TRIGGER IF NOT EXISTS atualizar_aviso_pagamento_quitado
         AFTER UPDATE OF pagamento_status ON contrato
         WHEN OLD.pagamento_status = 'Pendente' AND NEW.pagamento_status = 'Pago'
         BEGIN
             UPDATE notificacao
             SET titulo = 'Pagamento registrado',
                 mensagem = 'O responsável registrou o pagamento deste contrato.',
                 lida_em = COALESCE(lida_em, CURRENT_TIMESTAMP)
             WHERE contrato_id = NEW.contrato_id AND tipo = 'pagamento_pendente';
         END`
    );
}

async function migrarNotificacoes() {
    const colunas = await new Promise((resolve, reject) => {
        db.all('PRAGMA table_info(notificacao)', [], (erro, rows) => erro ? reject(erro) : resolve(rows));
    });
    const existentes = new Map(colunas.map(({ name, notnull }) => [name, notnull]));
    if (!existentes.size || (existentes.has('referencia') && existentes.get('contrato_id') === 0)) return;

    await executar('DROP TRIGGER IF EXISTS atualizar_aviso_pagamento_quitado');
    await executar('DROP INDEX IF EXISTS idx_notificacao_destinatario');
    await executar('BEGIN IMMEDIATE');
    try {
        await executar('ALTER TABLE notificacao RENAME TO notificacao_legada');
        await executar(
            `CREATE TABLE notificacao (
                notificacao_id INTEGER PRIMARY KEY AUTOINCREMENT,
                destinatario_tipo VARCHAR(10) NOT NULL CHECK (destinatario_tipo IN ('pais', 'baba')),
                destinatario_codigo CHAR(12) NOT NULL,
                tipo VARCHAR(40) NOT NULL,
                contrato_id INTEGER,
                referencia VARCHAR(100) NOT NULL,
                titulo VARCHAR(160) NOT NULL,
                mensagem TEXT NOT NULL,
                criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                lida_em TEXT,
                UNIQUE (tipo, destinatario_tipo, destinatario_codigo, referencia),
                FOREIGN KEY (contrato_id) REFERENCES contrato (contrato_id) ON DELETE CASCADE
            )`
        );
        await executar(
            `INSERT INTO notificacao
             (notificacao_id, destinatario_tipo, destinatario_codigo, tipo, contrato_id,
              referencia, titulo, mensagem, criada_em, lida_em)
             SELECT notificacao_id, destinatario_tipo, destinatario_codigo, tipo, contrato_id,
                    'contrato:' || contrato_id, titulo, mensagem, criada_em, lida_em
             FROM notificacao_legada`
        );
        await executar('DROP TABLE notificacao_legada');
        await executar(
            `CREATE INDEX idx_notificacao_destinatario
             ON notificacao (destinatario_tipo, destinatario_codigo, criada_em DESC)`
        );
        await executar('COMMIT');
    } catch (erro) {
        await executar('ROLLBACK').catch(() => {});
        throw erro;
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