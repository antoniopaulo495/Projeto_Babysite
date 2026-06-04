// src/models/babysite_CRUD.js

// CORREÇÃO 1: Apontando para o nome correto do seu arquivo de conexão
import Database from '../database/database.js';

function generateId(prefix) {
  return `${prefix}${Date.now().toString().slice(-9)}`;
}

async function ensureUsuario(db, { usuario_codigo, cpf, email_1, email_2, telefone, nome }) {
  const codigo = usuario_codigo || `USR${Date.now().toString().slice(-9)}`;

  if (!cpf || !email_1 || !telefone || !nome) {
    throw new Error('Dados obrigatórios do usuário ausentes.');
  }

  if (usuario_codigo) {
    const existingById = await db.get(
      `SELECT usuario_codigo, cpf, email_1, email_2, telefone FROM usuario WHERE usuario_codigo = ?`,
      [usuario_codigo]
    );

    if (existingById) {
      if (
        existingById.cpf === cpf &&
        existingById.email_1 === email_1 &&
        existingById.telefone === telefone &&
        (existingById.email_2 || null) === (email_2 || null)
      ) {
        return usuario_codigo;
      }
      throw new Error('Código de usuário já existe com dados diferentes.');
    }
  }

  const existingByUniqueField = await db.get(
    `SELECT usuario_codigo, cpf, email_1, email_2, telefone FROM usuario
     WHERE cpf = ? OR email_1 = ? OR telefone = ? OR email_2 = ?`,
    [cpf, email_1, telefone, email_2 || null]
  );

  if (existingByUniqueField) {
    if (
      existingByUniqueField.cpf === cpf &&
      existingByUniqueField.email_1 === email_1 &&
      existingByUniqueField.telefone === telefone &&
      (existingByUniqueField.email_2 || null) === (email_2 || null)
    ) {
      return existingByUniqueField.usuario_codigo;
    }
    throw new Error('Já existe um usuário com CPF, email ou telefone igual no sistema.');
  }

  await db.run(
    `INSERT INTO usuario (usuario_codigo, cpf, email_1, email_2, telefone, nome) VALUES (?, ?, ?, ?, ?, ?)`,
    [codigo, cpf, email_1, email_2 || null, telefone, nome]
  );

  return codigo;
}

// 1. CREATE - Cadastrar a base do Usuário
async function create({ usuario_codigo, cpf, email_1, email_2, telefone, nome }) {
  const db = await Database.connect();

  if (usuario_codigo && cpf && email_1 && telefone && nome) {
    const codigo = await ensureUsuario(db, {
      usuario_codigo,
      cpf,
      email_1,
      email_2,
      telefone,
      nome,
    });

    return await readById(codigo);
  } else {
    throw new Error('Não foi possível criar o usuário. Dados obrigatórios ausentes.');
  }
}

async function ensureUniqueBaba(db, { codigo_baba, cpf, email_1, email_2, telefone }) {
  if (!cpf || !email_1 || !telefone) {
    throw new Error('Dados obrigatórios da babá ausentes.');
  }

  const existing = await db.get(
    `SELECT codigo_baba FROM baba WHERE codigo_baba = ? OR cpf = ? OR email_1 = ? OR telefone = ? OR email_2 = ?`,
    [codigo_baba || '', cpf, email_1, telefone, email_2 || null]
  );

  if (existing) {
    throw new Error('Já existe uma babá com CPF, email ou telefone igual no sistema.');
  }
}

async function ensureUniquePais(db, { codigo_pais, cpf, email_1, email_2, telefone }) {
  if (!cpf || !email_1 || !telefone) {
    throw new Error('Dados obrigatórios do responsável ausentes.');
  }

  const existing = await db.get(
    `SELECT codigo_pais FROM pais WHERE codigo_pais = ? OR cpf = ? OR email_1 = ? OR telefone = ? OR email_2 = ?`,
    [codigo_pais || '', cpf, email_1, telefone, email_2 || null]
  );

  if (existing) {
    throw new Error('Já existe um responsável com CPF, email ou telefone igual no sistema.');
  }
}

async function ensureUniqueFilho(db, { codigo_filhos, cpf }) {
  if (!cpf) {
    throw new Error('Dados obrigatórios do filho ausentes.');
  }

  const existing = await db.get(
    `SELECT codigo_filhos FROM filhos WHERE codigo_filhos = ? OR cpf = ?`,
    [codigo_filhos || '', cpf]
  );

  if (existing) {
    throw new Error('Já existe um filho com CPF igual no sistema.');
  }
}

// 2. CREATE BABA - Vincula na tabela de babás
async function createBaba({ codigo_baba, cpf, email, email_1, email_2, telefone, nome, usuario_codigo, foto, antecedentes_pdf }) {
  const db = await Database.connect();

  const finalEmail = email_1 || email;

  await ensureUniqueBaba(db, {
    codigo_baba,
    cpf,
    email_1: finalEmail,
    email_2,
    telefone,
  });

  const usuarioCodigo = await ensureUsuario(db, {
    usuario_codigo,
    cpf,
    email_1: finalEmail,
    email_2,
    telefone,
    nome,
  });

  const babaCodigo = codigo_baba || generateId('BAB');
  const sql = `
    INSERT INTO baba (
      codigo_baba, cpf, email_1, email_2, telefone, nome, usuario_codigo, status_cadastro, foto, antecedentes_pdf
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const status_cadastro = 'Ativa';
  await db.run(sql, [
    babaCodigo,
    cpf,
    finalEmail,
    email_2 || null,
    telefone,
    nome,
    usuarioCodigo,
    status_cadastro,
    foto || null,
    antecedentes_pdf || null,
  ]);
  return { success: true, message: 'Babá vinculada com sucesso!', codigo_baba: babaCodigo, usuario_codigo: usuarioCodigo };
}

// 3. CREATE PAIS - Vincula na tabela de pais
async function createPais({ codigo_pais, cpf, email_1, email_2, email_principal, email_secundario, telefone, nome, usuario_codigo, filhos = [] }) {
  const db = await Database.connect();
  const finalEmail = email_1 || email_principal;
  const finalEmail2 = email_2 || email_secundario;

  await ensureUniquePais(db, {
    codigo_pais,
    cpf,
    email_1: finalEmail,
    email_2: finalEmail2,
    telefone,
  });

  const usuarioCodigo = await ensureUsuario(db, {
    usuario_codigo,
    cpf,
    email_1: finalEmail,
    email_2: finalEmail2,
    telefone,
    nome,
  });

  const paisCodigo = codigo_pais || generateId('PAI');
  const sql = `
    INSERT INTO pais (
      codigo_pais, cpf, email_1, email_2, telefone, nome, usuario_codigo
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  await db.run(sql, [paisCodigo, cpf, finalEmail, finalEmail2 || null, telefone, nome, usuarioCodigo]);

  if (Array.isArray(filhos) && filhos.length > 0) {
    const filhoSql = `
      INSERT INTO filhos (
        codigo_filhos, cpf, alergias, nome, usuario_codigo
      ) VALUES (?, ?, ?, ?, ?)
    `;

    for (const filho of filhos) {
      const codigoFilho = filho.codigo_filhos || generateId('FIL');
      await ensureUniqueFilho(db, { codigo_filhos: codigoFilho, cpf: filho.cpf || '00000000000' });
      await db.run(filhoSql, [
        codigoFilho,
        filho.cpf || '00000000000',
        filho.alergias || filho.documento_alergia || 'Sem alergias',
        filho.nome || 'Nome não informado',
        usuarioCodigo,
      ]);
    }
  }

  return { success: true, message: 'Responsável vinculado com sucesso!', codigo_pais: paisCodigo, usuario_codigo: usuarioCodigo };
}

// CORREÇÃO 2: Adicionando a função para a tabela de Filhos
async function createFilho({ codigo_filhos, cpf, alergias, nome, usuario_codigo }) {
  const db = await Database.connect();
  await ensureUniqueFilho(db, { codigo_filhos, cpf });

  const filhoCodigo = codigo_filhos || generateId('FIL');
  const sql = `
    INSERT INTO filhos (
      codigo_filhos, cpf, alergias, nome, usuario_codigo
    ) VALUES (?, ?, ?, ?, ?)
  `;
  
  await db.run(sql, [filhoCodigo, cpf, alergias, nome, usuario_codigo]);
  return { success: true, message: 'Filho cadastrado com sucesso!', codigo_filhos: filhoCodigo };
}

// 5. READ - Buscar usuários com filtros dinâmicos ou listar todos
async function read(field, value) {
  const db = await Database.connect();

  if (field && value) {
    const sql = `
      SELECT usuario_codigo, cpf, email_1, email_2, telefone, nome 
      FROM usuario WHERE ${field} = ?
    `;
    return await db.all(sql, [value]);
  }

  const sql = `SELECT usuario_codigo, cpf, email_1, email_2, telefone, nome FROM usuario`;
  return await db.all(sql);
}

// 6. READ BY ID - Buscar um usuário específico pelo código
async function readById(usuario_codigo) {
  const db = await Database.connect();

  if (usuario_codigo) {
    const sql = `
      SELECT usuario_codigo, cpf, email_1, email_2, telefone, nome 
      FROM usuario WHERE usuario_codigo = ?
    `;
    const usuario = await db.get(sql, [usuario_codigo]);
    if (usuario) return usuario;
    throw new Error('Usuário não encontrado.');
  }
  throw new Error('Código do usuário não fornecido.');
}

// 7. UPDATE - Atualizar os dados de um usuário (e suas especializações: baba, pais)
async function update({ usuario_codigo, email_1, email_2, telefone, nome, status_cadastro }) {
  const db = await Database.connect();

  if (usuario_codigo && email_1 && telefone && nome) {
    const existingConflict = await db.get(
      `SELECT usuario_codigo FROM usuario WHERE usuario_codigo != ? AND (email_1 = ? OR telefone = ? OR email_2 = ?)`,
      [usuario_codigo, email_1, telefone, email_2 || null]
    );

    if (existingConflict) {
      throw new Error('Outro usuário já possui este email ou telefone.');
    }

    // Atualizar usuário base
    const sql = `
      UPDATE usuario 
      SET email_1 = ?, email_2 = ?, telefone = ?, nome = ? 
      WHERE usuario_codigo = ?
    `;
    const { changes } = await db.run(sql, [email_1, email_2 || null, telefone, nome, usuario_codigo]);
    if (changes === 1) {
      // Atualizar também as babás vinculadas a este usuário
      await db.run(
        `UPDATE baba 
         SET email_1 = ?, email_2 = ?, telefone = ?, nome = ?, status_cadastro = COALESCE(?, status_cadastro) 
         WHERE usuario_codigo = ?`,
        [email_1, email_2 || null, telefone, nome, status_cadastro || null, usuario_codigo]
      );
      
      // Atualizar também os pais vinculados a este usuário
      await db.run(
        `UPDATE pais 
         SET email_1 = ?, email_2 = ?, telefone = ?, nome = ? 
         WHERE usuario_codigo = ?`,
        [email_1, email_2 || null, telefone, nome, usuario_codigo]
      );
      
      return await readById(usuario_codigo);
    }
    throw new Error('Usuário não encontrado para atualização.');
  }
  throw new Error('Dados insuficientes para atualizar o usuário.');
}

// 8. REMOVE - Excluir um usuário do sistema (e todas suas especializações)
async function remove(usuario_codigo) {
  const db = await Database.connect();

  if (usuario_codigo) {
    // Deletar filhos vinculados
    await db.run(`DELETE FROM filhos WHERE usuario_codigo = ?`, [usuario_codigo]);
    
    // Deletar babás vinculadas
    await db.run(`DELETE FROM baba WHERE usuario_codigo = ?`, [usuario_codigo]);
    
    // Deletar responsáveis vinculados
    await db.run(`DELETE FROM pais WHERE usuario_codigo = ?`, [usuario_codigo]);
    
    // Por fim, deletar o usuário
    const sql = `DELETE FROM usuario WHERE usuario_codigo = ?`;
    const { changes } = await db.run(sql, [usuario_codigo]);
    if (changes === 1) return true;
    throw new Error('Usuário não encontrado para exclusão.');
  }
  throw new Error('Código do usuário não fornecido para exclusão.');
}

// 9. UPDATE BABA - Atualizar dados de uma babá
async function updateBaba({ codigo_baba, nome, email_1, email_2, telefone, status_cadastro, foto }) {
  const db = await Database.connect();

  if (codigo_baba && (nome || email_1 || telefone)) {
    const baba = await db.get(`SELECT usuario_codigo FROM baba WHERE codigo_baba = ?`, [codigo_baba]);
    if (!baba) {
      throw new Error('Babá não encontrada para atualização.');
    }

    const existingConflict = await db.get(
      `SELECT codigo_baba FROM baba WHERE codigo_baba != ? AND (email_1 = ? OR telefone = ?)`,
      [codigo_baba, email_1, telefone]
    );

    if (existingConflict) {
      throw new Error('Outra babá já possui este email ou telefone.');
    }

    const sql = `
      UPDATE baba 
      SET nome = COALESCE(?, nome), 
          email_1 = COALESCE(?, email_1), 
          email_2 = ?, 
          telefone = COALESCE(?, telefone), 
          status_cadastro = COALESCE(?, status_cadastro),
          foto = COALESCE(?, foto)
      WHERE codigo_baba = ?
    `;
    const { changes } = await db.run(sql, [nome, email_1, email_2 || null, telefone, status_cadastro, foto || null, codigo_baba]);
    if (changes === 1) {
      return await db.get(`
        SELECT b.codigo_baba, b.nome, b.cpf, b.email_1, b.email_2, b.telefone, b.status_cadastro, b.foto
        FROM baba b
        WHERE b.codigo_baba = ?
      `, [codigo_baba]);
    }
    throw new Error('Falha ao atualizar a babá.');
  }
  throw new Error('Dados insuficientes para atualizar a babá.');
}

// 10. REMOVE BABA - Excluir uma babá pelo código (e usuário se ficar órfão)
async function removeBaba(codigo_baba) {
  const db = await Database.connect();

  if (codigo_baba) {
    // Buscar o usuário_codigo antes de deletar
    const baba = await db.get(`SELECT usuario_codigo FROM baba WHERE codigo_baba = ?`, [codigo_baba]);
    
    // Deletar a babá
    const sql = `DELETE FROM baba WHERE codigo_baba = ?`;
    const { changes } = await db.run(sql, [codigo_baba]);
    
    if (changes === 1) {
      // Verificar se o usuário ainda tem outras especializações
      if (baba) {
        const temOutraEspecializacao = await db.get(
          `SELECT 1 FROM baba WHERE usuario_codigo = ? 
           UNION 
           SELECT 1 FROM pais WHERE usuario_codigo = ? 
           UNION 
           SELECT 1 FROM filhos WHERE usuario_codigo = ?`,
          [baba.usuario_codigo, baba.usuario_codigo, baba.usuario_codigo]
        );
        
        // Se não tem nenhuma especialização, deletar o usuário
        if (!temOutraEspecializacao) {
          await db.run(`DELETE FROM usuario WHERE usuario_codigo = ?`, [baba.usuario_codigo]);
        }
      }
      return true;
    }
    throw new Error('Babá não encontrada para exclusão.');
  }
  throw new Error('Código da babá não fornecido para exclusão.');
}

// 10B. REMOVE PAIS - Excluir um responsável pelo código (e usuário se ficar órfão)
async function removePais(codigo_pais) {
  const db = await Database.connect();

  if (codigo_pais) {
    // Buscar o usuário_codigo antes de deletar
    const pais = await db.get(`SELECT usuario_codigo FROM pais WHERE codigo_pais = ?`, [codigo_pais]);
    
    // Deletar o responsável
    const sql = `DELETE FROM pais WHERE codigo_pais = ?`;
    const { changes } = await db.run(sql, [codigo_pais]);
    
    if (changes === 1) {
      // Verificar se o usuário ainda tem outras especializações
      if (pais) {
        const temOutraEspecializacao = await db.get(
          `SELECT 1 FROM baba WHERE usuario_codigo = ? 
           UNION 
           SELECT 1 FROM pais WHERE usuario_codigo = ? 
           UNION 
           SELECT 1 FROM filhos WHERE usuario_codigo = ?`,
          [pais.usuario_codigo, pais.usuario_codigo, pais.usuario_codigo]
        );
        
        // Se não tem nenhuma especialização, deletar o usuário
        if (!temOutraEspecializacao) {
          await db.run(`DELETE FROM usuario WHERE usuario_codigo = ?`, [pais.usuario_codigo]);
        }
      }
      return true;
    }
    throw new Error('Responsável não encontrado para exclusão.');
  }
  throw new Error('Código do responsável não fornecido para exclusão.');
}

// 11. READ ALL BABYS (Seu INNER JOIN original para as listagens)
async function readAllBabys() {
  const db = await Database.connect();
  const sql = `
    SELECT b.codigo_baba,
           u.nome,
           u.cpf,
           COALESCE(b.email_1, u.email_1) AS email,
           b.telefone,
           b.foto AS foto_perfil_nome,
           b.email_2,
           COALESCE(b.status_cadastro, 'Ativa') AS status_cadastro
    FROM baba AS b 
    INNER JOIN usuario AS u ON b.usuario_codigo = u.usuario_codigo 
    ORDER BY u.nome DESC
  `;
  return await db.all(sql);
}

// Exportando todas as funções
export default { 
  create, 
  createBaba, 
  createPais,
  createFilho, // Exportando a função nova
  read, 
  readById, 
  update, 
  updateBaba,
  remove, 
  removeBaba,
  removePais,
  readAllBabys 
};