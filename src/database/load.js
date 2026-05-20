import Migration from './migration.js';
import Seed from './seeders.js';
 
async function load() {
  try {
    console.log('🔄 Criando tabelas no banco de dados (Migration)...');
    await Migration.up();
    
    console.log('🌱 Inserindo dados de teste (Seeders)...');
    await Seed.up();
    
    console.log('✅ Banco de dados configurado e pronto para uso!');
  } catch (error) {
    console.error('❌ Erro ao carregar o banco de dados:', error);
  }
}
 
load();