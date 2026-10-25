const databaseName = 'babysite-cadastro';
const storeName = 'documentos';
const recordKeys = {
  certidao: 'certidao-baba',
  diploma: 'diploma-baba'
};

function abrirBanco() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível preparar o armazenamento do cadastro.'));
  });
}

async function executar(transacao, operacao) {
  const banco = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = banco.transaction(storeName, transacao);
    let resultado;
    tx.oncomplete = () => {
      banco.close();
      resolve(resultado);
    };
    tx.onerror = () => {
      banco.close();
      reject(tx.error || new Error('Não foi possível armazenar o documento.'));
    };
    tx.onabort = () => {
      banco.close();
      reject(tx.error || new Error('O armazenamento do documento foi cancelado.'));
    };
    resultado = operacao(tx.objectStore(storeName));
  });
}

export function salvarCertidao(arquivo) {
  return executar('readwrite', (store) => store.put(arquivo, recordKeys.certidao));
}

export function salvarDiploma(arquivo) {
  return executar('readwrite', (store) => store.put(arquivo, recordKeys.diploma));
}

async function obterDocumento(chave) {
  const banco = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = banco.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).get(chave);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Não foi possível recuperar o documento.'));
    tx.oncomplete = () => banco.close();
    tx.onerror = () => {
      banco.close();
      reject(tx.error || new Error('Não foi possível recuperar o documento.'));
    };
  });
}

export function obterCertidao() {
  return obterDocumento(recordKeys.certidao);
}

export function obterDiploma() {
  return obterDocumento(recordKeys.diploma);
}

export function removerCertidao() {
  return executar('readwrite', (store) => store.delete(recordKeys.certidao));
}

export function removerDiploma() {
  return executar('readwrite', (store) => store.delete(recordKeys.diploma));
}
