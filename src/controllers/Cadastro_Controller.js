const { randomBytes, scrypt } = require('crypto');
const { promisify } = require('util');
const Cadastro = require('../models/Cadastro');
const Usuario = require('../models/Usuario');
const Sessoes = require('../middleware/Sessoes');
const disponibilidadeValida = require('../utils/Disponibilidade');

const derivarSenha = promisify(scrypt);
const estadosBrasileiros = new Set([
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
    'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
    'SP', 'SE', 'TO', 'ESTADO_1', 'ESTADO_2', 'ESTADO_3', 'ESTADO_4', 'ESTADO_5'
]);

function normalizarTexto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

const cadastroController = {
    cadastrar: async (req, res) => {
        const dados = req.body || {};
        const nome = normalizarTexto(dados.nome);
        const cpf = normalizarTexto(dados.cpf).replace(/\D/g, '');
        const email = normalizarTexto(dados.email).toLowerCase();
        const telefone = normalizarTexto(dados.telefone);
        const senha = typeof dados.senha === 'string' ? dados.senha : '';
        const tipoUsuario = dados.tipo_usuario;
        const disponibilidade = dados.disponibilidade;
        const tarifaHora = dados.tarifa_hora;
        const estado = normalizarTexto(dados.estado).toUpperCase();
        const municipio = normalizarTexto(dados.municipio);

        if (tipoUsuario === 'baba' && !disponibilidadeValida(disponibilidade)) {
            return res.status(400).json({ erro: 'Informe pelo menos um dia habitual com horários válidos.' });
        }
        if (tipoUsuario === 'baba' && (
            typeof tarifaHora !== 'number' || !Number.isFinite(tarifaHora) || tarifaHora <= 0 || tarifaHora > 100000
            || !estadosBrasileiros.has(estado) || !municipio || municipio.length > 100
        )) {
            return res.status(400).json({ erro: 'Confira o endereço e a tarifa por hora informados.' });
        }

        if (!['pais', 'baba'].includes(tipoUsuario)
            || !nome || nome.length > 100
            || cpf.length !== 11
            || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 300
            || !telefone || telefone.length > 20
            || senha.length < 8) {
            return res.status(400).json({ erro: 'Confira os dados obrigatórios do cadastro.' });
        }

        try {
            const sal = randomBytes(16).toString('hex');
            const hash = (await derivarSenha(senha, sal, 64)).toString('hex');
            const { usuarioCodigo, perfilCodigo } = await Cadastro.criar({
                tipo_usuario: tipoUsuario,
                nome,
                cpf,
                email,
                telefone,
                senhaHash: `${sal}:${hash}`,
                disponibilidade: tipoUsuario === 'baba' ? disponibilidade : [],
                tarifa_hora: tipoUsuario === 'baba' ? tarifaHora : null,
                estado: tipoUsuario === 'baba' ? estado : null,
                municipio: tipoUsuario === 'baba' ? municipio : null
            });

            const usuario = await new Promise((resolve, reject) => {
                Usuario.buscarPerfilPorCodigo(usuarioCodigo, (erroConsulta, perfil) => {
                    if (erroConsulta) return reject(erroConsulta);
                    resolve(perfil);
                });
            });
            if (!usuario) return res.status(500).json({ erro: 'Não foi possível carregar o perfil cadastrado.' });
            const token = Sessoes.criar(usuario);

            return res.status(201).json({
                mensagem: 'Cadastro realizado com sucesso.',
                usuario_codigo: usuarioCodigo,
                codigo_perfil: perfilCodigo,
                token,
                perfil: usuario
            });
        } catch (erro) {
            if (erro.code === 'SQLITE_CONSTRAINT') {
                return res.status(409).json({ erro: 'Já existe um cadastro com este CPF ou e-mail.' });
            }
            console.error('Erro ao cadastrar usuário:', erro.message);
            return res.status(500).json({ erro: 'Não foi possível concluir o cadastro.' });
        }
    }
};

module.exports = cadastroController;