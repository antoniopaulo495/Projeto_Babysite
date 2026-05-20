import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import Database from './database.js'; // Importa o seu arquivo de conexão

async function up() {
  // Caminho para o arquivo com os dados de teste
  const file = resolve('src', 'database', 'seeders.json');
 
  // Lê e transforma o JSON em um objeto Javascript
  const seed = JSON.parse(readFileSync(file));
 
  // Abre a conexão com o banco SQLite
  const db = await Database.connect();

  console.log("Populando o banco de dados do Babysite...");

  // Se existirem usuários no JSON, insere cada um deles no banco
  if (seed.usuarios) {
    for (const usuario of seed.usuarios) {
      await db.run(
        `INSERT OR IGNORE INTO usuario (usuario_codigo, cpf, email_1, email_2, telefone, nome) VALUES (?, ?, ?, ?, ?, ?)`,
        [usuario.usuario_codigo, usuario.cpf, usuario.email_1, usuario.email_2, usuario.telefone, usuario.nome]
      );
    }
  }

  // Se existirem pais no JSON, insere no banco
  if (seed.pais) {
    for (const pai of seed.pais) {
      await db.run(
        `INSERT OR IGNORE INTO pais (codigo_pais, cpf, email_1, email_2, telefone, nome, usuario_codigo) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [pai.codigo_pais, pai.cpf, pai.email_1, pai.email_2, pai.telefone, pai.nome, pai.usuario_codigo]
      );
    }
  }

  // Se existirem babás no JSON, insere no banco
  if (seed.babas) {
    for (const baba of seed.babas) {
      await db.run(
        `INSERT OR IGNORE INTO baba (codigo_baba, cpf, email_1, email_2, telefone, nome, usuario_codigo) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [baba.codigo_baba, baba.cpf, baba.email_1, baba.email_2, baba.telefone, baba.nome, baba.usuario_codigo]
      );
    }
  }

  // Se existirem filhos no JSON, insere no banco (corrige nome da coluna para 'alergias')
  if (seed.filhos) {
    for (const filho of seed.filhos) {
      await db.run(
        `INSERT OR IGNORE INTO filhos (codigo_filhos, cpf, alergias, nome, usuario_codigo) VALUES (?, ?, ?, ?, ?)`,
        [filho.codigo_filhos, filho.cpf, filho.alergias, filho.nome, filho.usuario_codigo]
      );
    }
  }

  // Compatibilidade: se o seed for um array simples (lista de babys), insere na tabela 'baba'
  if (Array.isArray(seed)) {
    // Verifica se a tabela 'baba' já tem a coluna 'foto'
    const tableInfo = await db.all(`PRAGMA table_info('baba')`);
    const cols = tableInfo.map(c => c.name);
    const hasFoto = cols.includes('foto');
    for (const item of seed) {
      // tenta mapear campos comuns para a tabela 'baba'
      const codigo_baba = item.codigo_baba || (`BAB${Date.now().toString().slice(-9)}`);
      const cpf = (item.cpf || '').replace(/\D/g, '').slice(0,11) || '00000000000';
      const email_1 = item.email || item.email_1 || 'email@padrao.com';
      const email_2 = item.email2 || item.email_2 || null;
      const telefone = item.telefone || '000000000';
      const nome = item.nome || item.nome_completo || 'Nome Não Informado';
      const foto = item.foto_base64 || item.foto_perfil_nome || null;

      if (hasFoto) {
        await db.run(
          `INSERT OR IGNORE INTO baba (codigo_baba, cpf, email_1, email_2, telefone, nome, usuario_codigo, foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [codigo_baba, cpf, email_1, email_2, telefone, nome, null, foto]
        );
      } else {
        await db.run(
          `INSERT OR IGNORE INTO baba (codigo_baba, cpf, email_1, email_2, telefone, nome, usuario_codigo) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [codigo_baba, cpf, email_1, email_2, telefone, nome, null]
        );
      }
    }
  }

  console.log("Banco de dados populado com sucesso!");
}
 
export default { up };