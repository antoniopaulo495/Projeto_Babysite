import Database from './database.js';

async function up() {
  const db = await Database.connect();

  console.log("Iniciando a criação das tabelas...");

  // 1. Criar Tabela Usuario
  await db.run(`
    CREATE TABLE IF NOT EXISTS usuario (
      usuario_codigo CHAR(12) PRIMARY KEY,
      cpf CHAR(11) NOT NULL,
      email_1 VARCHAR(300) NOT NULL,
      email_2 VARCHAR(300), 
      telefone VARCHAR(20) NOT NULL,
      nome VARCHAR(100) NOT NULL
    )
  `);

  // 2. Criar Tabela Pais
  await db.run(`
    CREATE TABLE IF NOT EXISTS pais ( 
      codigo_pais CHAR(12) PRIMARY KEY, 
      cpf CHAR(11) NOT NULL, 
      email_1 VARCHAR(300) NOT NULL, 
      email_2 VARCHAR(300), 
      telefone VARCHAR(20) NOT NULL, 
      nome VARCHAR(100) NOT NULL, 
      usuario_codigo CHAR(12) NOT NULL, 
      FOREIGN KEY (usuario_codigo) REFERENCES usuario (usuario_codigo) 
    )
  `);

  // 3. Criar Tabela Baba
  await db.run(`
    CREATE TABLE IF NOT EXISTS baba ( 
      codigo_baba CHAR(12) PRIMARY KEY, 
      cpf CHAR(11) NOT NULL, 
      email_1 VARCHAR(300) NOT NULL, 
      email_2 VARCHAR(300), 
      telefone VARCHAR(20) NOT NULL, 
      nome VARCHAR(100) NOT NULL, 
      usuario_codigo CHAR(12) NOT NULL, 
      status_cadastro VARCHAR(20) DEFAULT 'Ativa',
      foto TEXT,
      antecedentes_pdf TEXT,
      FOREIGN KEY (usuario_codigo) REFERENCES usuario (usuario_codigo) 
    )
  `);

  // 4. Criar Tabela Filhos
  await db.run(`
    CREATE TABLE IF NOT EXISTS filhos ( 
      codigo_filhos CHAR(12) PRIMARY KEY, 
      cpf CHAR(11) NOT NULL, 
      alergias TEXT NOT NULL, 
      nome VARCHAR(50) NOT NULL, 
      usuario_codigo CHAR(12) NOT NULL, 
      FOREIGN KEY (usuario_codigo) REFERENCES usuario (usuario_codigo) 
    )
  `);

  // 5. Índices de unicidade para evitar registros duplicados
  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_cpf ON usuario (cpf)`);
  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_email_1 ON usuario (email_1)`);
  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_email_2 ON usuario (email_2)`);
  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_telefone ON usuario (telefone)`);

  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_baba_cpf ON baba (cpf)`);
  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_baba_email_1 ON baba (email_1)`);
  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_baba_email_2 ON baba (email_2)`);
  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_baba_telefone ON baba (telefone)`);

  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pais_cpf ON pais (cpf)`);
  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pais_email_1 ON pais (email_1)`);
  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pais_email_2 ON pais (email_2)`);
  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pais_telefone ON pais (telefone)`);

  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_filhos_cpf ON filhos (cpf)`);

  // Garantir colunas novas (compatibilidade com DB já criado)
  const babaInfo = await db.all(`PRAGMA table_info('baba')`);
  const babaCols = babaInfo.map(c => c.name);

  if (!babaCols.includes('foto')) {
    console.log('Adicionando coluna "foto" na tabela baba...');
    await db.run(`ALTER TABLE baba ADD COLUMN foto TEXT`);
  }

  if (!babaCols.includes('status_cadastro')) {
    console.log('Adicionando coluna "status_cadastro" na tabela baba...');
    await db.run(`ALTER TABLE baba ADD COLUMN status_cadastro VARCHAR(20) DEFAULT 'Ativa'`);
  }

  if (!babaCols.includes('antecedentes_pdf')) {
    console.log('Adicionando coluna "antecedentes_pdf" na tabela baba...');
    await db.run(`ALTER TABLE baba ADD COLUMN antecedentes_pdf TEXT`);
  }

  console.log("Estrutura do banco de dados criada com sucesso! (Banco vazio)");
}

export default { up };