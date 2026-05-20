import express from 'express';
// Ajustado para garantir o caminho correto até a pasta models
import BabysiteModel from './models/babysite_CRUD.js';

class HTTPError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const router = express.Router();

// ==========================================
// ROTAS DE CADASTRO (POST)
// ==========================================

// Rota para cadastrar o Usuário base
router.post('/usuarios', async (req, res, next) => {
  try {
    const usuario = req.body;
    const novoUsuario = await BabysiteModel.create(usuario);
    return res.status(201).json(novoUsuario);
  } catch (error) {
    next(new HTTPError('Não foi possível cadastrar o usuário: ' + error.message, 400));
  }
});

// Rota para cadastrar a Babá (vinculando ao usuário)
router.post('/babas', async (req, res, next) => {
  try {
    const baba = req.body;
    const novaBaba = await BabysiteModel.createBaba(baba);
    return res.status(201).json(novaBaba);
  } catch (error) {
    next(new HTTPError('Não foi possível cadastrar a babá: ' + error.message, 400));
  }
});

// ADICIONADO: Rota para cadastrar Pais/Responsáveis
router.post('/pais', async (req, res, next) => {
  try {
    const pai = req.body;
    const novoPai = await BabysiteModel.createPais(pai);
    return res.status(201).json(novoPai);
  } catch (error) {
    next(new HTTPError('Não foi possível cadastrar o responsável: ' + error.message, 400));
  }
});

// ADICIONADO: Rota para cadastrar Filhos
router.post('/filhos', async (req, res, next) => {
  try {
    const filho = req.body;
    const novoFilho = await BabysiteModel.createFilho(filho);
    return res.status(201).json(novoFilho);
  } catch (error) {
    next(new HTTPError('Não foi possível cadastrar o filho: ' + error.message, 400));
  }
});

// ==========================================
// ROTAS DE BUSCA (GET)
// ==========================================

// Rota para listar todas as Babás (Usa o seu INNER JOIN)
router.get('/babas', async (req, res, next) => {
  try {
    const babas = await BabysiteModel.readAllBabys();
    res.json(babas);
  } catch (error) {
    next(new HTTPError('Não foi possível buscar as babás.', 400));
  }
});

// Rota para listar Usuários (com filtro opcional, ex: ?nome=Ana)
router.get('/usuarios', async (req, res, next) => {
  try {
    const queries = Object.keys(req.query);
    
    if (queries.length > 0) {
      const field = queries[0];
      const value = req.query[field];
      const usuarios = await BabysiteModel.read(field, value);
      return res.json(usuarios);
    }

    const usuarios = await BabysiteModel.read();
    res.json(usuarios);
  } catch (error) {
    next(new HTTPError('Não foi possível buscar os usuários.', 400));
  }
});

// Rota para buscar um Usuário específico pelo ID (Código)
router.get('/usuarios/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const usuario = await BabysiteModel.readById(id);
    res.json(usuario);
  } catch (error) {
    next(new HTTPError('Usuário não encontrado.', 404));
  }
});

// ==========================================
// ROTAS DE ATUALIZAÇÃO (PUT)
// ==========================================
router.put('/usuarios/:id', async (req, res, next) => {
  try {
    const usuario = req.body;
    const id = req.params.id;
    
    const usuarioAtualizado = await BabysiteModel.update({ ...usuario, usuario_codigo: id });
    return res.json(usuarioAtualizado);
  } catch (error) {
    next(new HTTPError('Não foi possível atualizar o usuário.', 400));
  }
});

// ==========================================
// ROTAS DE EXCLUSÃO (DELETE)
// ==========================================
router.delete('/usuarios/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (await BabysiteModel.remove(id)) {
      res.sendStatus(204);
    }
  } catch (error) {
    next(new HTTPError('Não foi possível remover o usuário.', 400));
  }
});

router.delete('/babas/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (await BabysiteModel.removeBaba(id)) {
      res.sendStatus(204);
    }
  } catch (error) {
    next(new HTTPError('Não foi possível remover a babá.', 400));
  }
});

// ==========================================
// HANDLERS (Interceptadores de Erro)
// ==========================================

router.use((req, res, next) => {
  res.status(404).json({ message: 'Conteúdo não encontrado!' });
});

router.use((err, req, res, next) => {
  if (err instanceof HTTPError) {
    res.status(err.code).json({ message: err.message });
  } else {
    res.status(500).json({ message: 'Algo quebrou no servidor!' });
  }
});

export default router;