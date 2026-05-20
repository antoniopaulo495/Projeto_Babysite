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

  console.log("Estrutura do banco de dados criada com sucesso! (Banco vazio)");
}

export default { up };