const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const caminhoDados = path.join(__dirname, 'data', 'babas.json');

// Rota para LISTAR babás
router.get('/', (req, res) => {
    const dados = JSON.parse(fs.readFileSync(caminhoDados, 'utf-8'));
    res.json(dados);
});

// Rota para CADASTRAR babá
router.post('/', (req, res) => {
    const babas = JSON.parse(fs.readFileSync(caminhoDados, 'utf-8'));
    const novaBaba = req.body;
    
    babas.push(novaBaba);
    
    fs.writeFileSync(caminhoDados, JSON.stringify(babas, null, 2));
    res.status(201).json({ mensagem: "Salvo com sucesso!" });
});

module.exports = router;