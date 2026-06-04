// public/js/services/api.js

// O prefixo das rotas da sua API. Todas as requisições vão começar com '/api'
const domain = '/api';

/**
 * 1. CREATE (POST)
 * Serve para ENVIAR dados novos para o servidor (ex: cadastrar um novo usuário, babá ou pai).
 * @param {string} resource - O caminho da rota (ex: '/usuarios', '/babas', '/filhos')
 * @param {object} data - Os dados preenchidos no formulário do site
 */
async function create(resource, data) {
  const url = `${domain}${resource}`;

  const config = {
    method: 'POST',
    mode: 'cors',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    },
  };

  const res = await fetch(url, config);
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.message || 'Erro ao criar o recurso.');
  return responseData;
}

/**
 * 2. READ (GET)
 * Serve para BUSCAR informações do servidor (ex: listar todas as babás disponíveis, buscar dados de um filho).
 * @param {string} resource - O caminho da rota (ex: '/babas', '/usuarios/USR001')
 */
async function read(resource) {
  const url = `${domain}${resource}`;

  const res = await fetch(url);
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.message || 'Erro ao obter o recurso.');
  return responseData;
}

/**
 * 3. UPDATE (PUT)
 * Serve para ATUALIZAR registros existentes (ex: alterar o telefone da babá ou atualizar as alergias de uma criança).
 * @param {string} resource - O caminho da rota com o ID (ex: '/usuarios/USR001', '/filhos/FIL006')
 * @param {object} data - Os novos dados que vão substituir os antigos
 */
async function update(resource, data) {
  const url = `${domain}${resource}`;

  const config = {
    method: 'PUT',
    mode: 'cors',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    },
  };

  const res = await fetch(url, config);
  return await res.json();
}

/**
 * 4. REMOVE (DELETE)
 * Serve para EXCLUIR um registro do sistema (ex: remover uma conta ou deletar o perfil de um filho).
 * @param {string} resource - O caminho da rota com o ID a ser deletado (ex: '/filhos/FIL015')
 */
async function remove(resource) {
  const url = `${domain}${resource}`;

  const config = {
    method: 'DELETE',
    mode: 'cors',
  };

  const res = await fetch(url, config);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Erro ao remover: ${res.status}`);
  }
}

// Exporta o motor HTTP para ser importado e usado pelas telas do Babysite
export default { create, read, update, remove };