const app = require('./app');
const adminApp = require('./admin_App');
// Carrega o banco de dados e executa o schema e seeders na inicialização
require('./database/connection');

const PORT_PUBLIC = process.env.PORT_PUBLIC || 3000;
const PORT_ADMIN = process.env.PORT_ADMIN || 4000;

// Inicializa a aplicação pública na porta 3000
app.listen(PORT_PUBLIC, () => {
    console.log(`🚀 Aplicação Pública rodando em: http://localhost:${PORT_PUBLIC}`);
});

// Inicializa a aplicação administrativa na porta 4000
adminApp.listen(PORT_ADMIN, () => {
    console.log(`🛡️  Módulo Administrativo rodando em: http://localhost:${PORT_ADMIN}`);
});