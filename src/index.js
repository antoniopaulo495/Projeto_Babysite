const express = require('express');
const cors = require('cors');
const path = require('path');
const babaRoutes = require('./routes');

const app = express();
const PORT = 3000;

// Configurações
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (CSS, JS do front, Imagens)
app.use(express.static('public'));

// Rotas da API
app.use('/api/babas', babaRoutes);

// Rota para abrir a Home automaticamente
app.get('/', (req, res) => {
    // Agora o Node vai entrar em todas as subpastas até achar o arquivo!
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'html_home', 'home.html'));
});


app.listen(PORT, () => {
    console.log(`\n🚀 ==========================================`);
    console.log(`✅ Servidor Babysite ON!`);
    console.log(`🏠 Site: http://localhost:${PORT}`);
    console.log(`============================================\n`);
});


app.post('/api/babas', (req, res) => {
    const dadosRecebidos = req.body;
    // Aqui você usa o FS para escrever no seu JSON
    console.log("Nova babá cadastrada:", dadosRecebidos.nome);
    res.status(201).json({ mensagem: "Salvo com sucesso!" });
});

app.post('/api/responsaveis', (req, res) => {
    const familia = req.body;
    console.log("Família recebida:", familia.nome, "com", familia.filhos.length, "filhos.");
    // Lógica para salvar no responsaveis.json
    res.status(201).json({ status: "sucesso" });
});