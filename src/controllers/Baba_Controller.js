const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');
const Baba = require('../models/Baba');
const disponibilidadeValida = require('../utils/Disponibilidade');
const estadosBrasileiros = new Set([
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
    'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
    'SP', 'SE', 'TO', 'ESTADO_1', 'ESTADO_2', 'ESTADO_3', 'ESTADO_4', 'ESTADO_5'
]);
const intervaloCertidaoMs = 1000;
const diretorioUploads = path.resolve(__dirname, '../uploads/babas');

function caminhoUpload(caminhoRelativo) {
    if (typeof caminhoRelativo !== 'string' || !caminhoRelativo) return null;
    const absoluto = path.resolve(diretorioUploads, caminhoRelativo);
    return absoluto.startsWith(`${diretorioUploads}${path.sep}`) ? absoluto : null;
}

async function salvarArquivo(codigoBaba, arquivo, extensao) {
    const nomeArquivo = `${randomUUID()}${extensao}`;
    const diretorioBaba = path.join(diretorioUploads, codigoBaba);
    const absoluto = path.join(diretorioBaba, nomeArquivo);
    await fs.mkdir(diretorioBaba, { recursive: true });
    await fs.writeFile(absoluto, arquivo.buffer, { flag: 'wx' });
    return { absoluto, relativo: `${codigoBaba}/${nomeArquivo}` };
}

async function removerArquivo(caminhoRelativo) {
    const absoluto = caminhoUpload(caminhoRelativo);
    if (absoluto) await fs.unlink(absoluto).catch(() => {});
}

function fotoValida(arquivo) {
    const { buffer, mimetype } = arquivo;
    if (mimetype === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mimetype === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (mimetype === 'image/webp') return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    return false;
}

function exigirPerfilDaBaba(req, res, next) {
    if (req.sessao.perfil.tipo_usuario !== 'baba'
        || req.sessao.perfil.codigo_perfil !== req.params.codigo) {
        return res.status(403).json({ erro: 'Você só pode acessar seu próprio perfil de babá.' });
    }
    next();
}

const babaController = {
    reativarMinhaConta: async (req, res) => {
        if (req.sessao.perfil.tipo_usuario !== 'baba') {
            return res.status(403).json({ erro: 'Esta ação está disponível apenas para contas de babás.' });
        }
        try {
            const resultado = await Baba.reativarConta(req.sessao.perfil.codigo_perfil);
            if (resultado.reativada) {
                req.sessao.perfil.status_cadastro = 'Ativa';
                req.sessao.perfil.desativada_ate = null;
                return res.json({ mensagem: 'Sua conta foi reativada.' });
            }
            if (resultado.naoEncontrada) return res.status(404).json({ erro: 'Conta de babá não encontrada.' });
            if (resultado.prazoNaoEncerrado) {
                return res.status(403).json({
                    erro: 'A opção de reativar estará disponível após o fim do período de desativação.',
                    desativada_ate: resultado.desativadaAte
                });
            }
            res.status(409).json({ erro: 'Esta conta não está aguardando reativação.' });
        } catch (erro) {
            console.error('Não foi possível reativar a conta da babá.', erro);
            res.status(500).json({ erro: 'Não foi possível reativar sua conta.' });
        }
    },

    // GET /api/babas
    listarAtivas: async (req, res) => {
        try {
            res.json(await Baba.listarAtivas());
        } catch (erro) {
            console.error('Erro ao buscar listagem de babás:', erro.message);
            res.status(500).json({ erro: 'Erro ao buscar listagem de babás.' });
        }
    },

    buscarMeuPerfil: async (req, res) => {
        if (req.sessao.perfil.tipo_usuario !== 'baba'
            || req.sessao.perfil.codigo_perfil !== req.params.codigo) {
            return res.status(403).json({ erro: 'Você só pode consultar seu próprio perfil de babá.' });
        }
        try {
            const perfil = await Baba.buscarMeuPerfil(req.params.codigo);
            if (!perfil) return res.status(404).json({ erro: 'Perfil de babá não encontrado.' });
            const certidaoProximaAtualizacao = perfil.certidao_atualizada_em
                ? new Date(Date.parse(perfil.certidao_atualizada_em) + intervaloCertidaoMs).toISOString()
                : null;
            res.json({
                codigo_baba: perfil.codigo_baba,
                tarifa_hora: perfil.tarifa_hora,
                tarifa_negociavel: perfil.tarifa_negociavel,
                formas_pagamento: perfil.formas_pagamento,
                tarifa_proxima_alteracao_em: perfil.tarifa_proxima_alteracao_em,
                estado: perfil.estado,
                municipio: perfil.municipio,
                foto_disponivel: Boolean(perfil.foto),
                diploma_status: perfil.diploma_status,
                diploma: perfil.diploma_caminho ? {
                    nome: perfil.diploma_nome,
                    atualizado_em: perfil.diploma_atualizado_em,
                    status: perfil.diploma_status
                } : null,
                certidao_status: perfil.certidao_status,
                certidao_proxima_atualizacao_em: certidaoProximaAtualizacao,
                certidao: perfil.certidao_caminho ? {
                    nome: perfil.certidao_nome,
                    atualizada_em: perfil.certidao_atualizada_em,
                    status: perfil.certidao_status
                } : null
            });
        } catch (erro) {
            console.error('Não foi possível carregar o perfil da babá:', erro.message);
            res.status(500).json({ erro: 'Não foi possível carregar o perfil.' });
        }
    },

    atualizarPerfilPublico: async (req, res) => {
        if (req.sessao.perfil.tipo_usuario !== 'baba'
            || req.sessao.perfil.codigo_perfil !== req.params.codigo) {
            return res.status(403).json({ erro: 'Você só pode editar seu próprio perfil de babá.' });
        }

        const dados = req.body || {};
        const { tarifa_hora, tarifa_negociavel, formas_pagamento, estado, municipio } = dados;
        const tarifaInformada = Object.hasOwn(dados, 'tarifa_hora') || Object.hasOwn(dados, 'tarifa_negociavel');
        const tarifaNegociavel = tarifa_negociavel === true;
        const localizacaoInformada = estado !== undefined || municipio !== undefined;
        const formasPagamentoValidas = ['pix', 'dinheiro', 'cartao'];
        const formasPagamentoInvalidas = Object.hasOwn(dados, 'formas_pagamento')
            && (!Array.isArray(formas_pagamento)
                || formas_pagamento.length === 0
                || formas_pagamento.some((forma) => !formasPagamentoValidas.includes(forma))
                || new Set(formas_pagamento).size !== formas_pagamento.length);
        if ((tarifaInformada && typeof tarifa_negociavel !== 'boolean' && Object.hasOwn(dados, 'tarifa_negociavel'))
            || (tarifaInformada && tarifa_hora !== null && tarifa_hora !== undefined && typeof tarifa_hora !== 'number')
            || (estado !== undefined && estado !== null && typeof estado !== 'string')
            || (municipio !== undefined && municipio !== null && typeof municipio !== 'string')
            || formasPagamentoInvalidas) {
            return res.status(400).json({ erro: 'Confira a tarifa, as formas de pagamento, o estado e o município.' });
        }
        const tarifa = !Object.hasOwn(dados, 'tarifa_hora')
            ? undefined
            : tarifa_hora === null || tarifa_hora === '' ? null : Number(tarifa_hora);
        const estadoNormalizado = typeof estado === 'string' ? estado.trim().toUpperCase() : '';
        const municipioNormalizado = typeof municipio === 'string' ? municipio.trim() : '';
        const localizacaoLimpa = !estadoNormalizado && !municipioNormalizado;
        if ((tarifaInformada && tarifaNegociavel && tarifa !== null)
            || (tarifaInformada && !tarifaNegociavel && tarifa === undefined)
            || (tarifa !== undefined && tarifa !== null && (!Number.isFinite(tarifa) || tarifa < 25 || tarifa > 50))
            || (localizacaoInformada && !localizacaoLimpa && (!estadosBrasileiros.has(estadoNormalizado)
                || !municipioNormalizado || municipioNormalizado.length > 100))) {
            return res.status(400).json({ erro: 'A tarifa deve ficar entre R$ 25,00 e R$ 50,00; confira também o estado e município.' });
        }

        try {
            const resultado = await Baba.atualizarPerfilPublico(req.params.codigo, {
                ...(tarifaInformada ? { tarifa_hora: tarifa, tarifa_negociavel: tarifaNegociavel } : {}),
                ...(Object.hasOwn(dados, 'formas_pagamento') ? { formas_pagamento } : {}),
                ...(estado !== undefined || municipio !== undefined ? {
                    estado: localizacaoLimpa ? null : estadoNormalizado,
                    municipio: localizacaoLimpa ? null : municipioNormalizado
                } : {})
            });
            if (resultado.naoEncontrado) return res.status(404).json({ erro: 'Perfil de babá não encontrado.' });
            if (resultado.tarifaBloqueada) {
                return res.status(409).json({
                    erro: 'Você só pode mudar essa informação a cada 1 segundo.',
                    proxima_alteracao_tarifa: resultado.proximaAlteracao
                });
            }
            res.json({ mensagem: 'Perfil atualizado com sucesso.' });
        } catch (erro) {
            console.error('Não foi possível atualizar o perfil público da babá:', erro.message);
            res.status(500).json({ erro: 'Não foi possível atualizar o perfil.' });
        }
    },

    exigirPerfilDaBaba,

    buscarFoto: async (req, res) => {
        try {
            const perfil = await Baba.buscarMeuPerfil(req.params.codigo);
            const absoluto = caminhoUpload(perfil?.foto);
            if (!perfil || !absoluto) return res.status(404).json({ erro: 'Foto de perfil não encontrada.' });
            const imagem = await fs.readFile(absoluto);
            res.type(perfil.foto_mimetype || 'application/octet-stream').send(imagem);
        } catch (erro) {
            if (erro.code === 'ENOENT') return res.status(404).json({ erro: 'Foto de perfil não encontrada.' });
            console.error('Não foi possível carregar a foto de perfil.', erro.message);
            res.status(500).json({ erro: 'Não foi possível carregar a foto de perfil.' });
        }
    },

    atualizarFoto: async (req, res) => {
        if (!req.file || !fotoValida(req.file)) {
            return res.status(400).json({ erro: 'Envie uma imagem JPEG, PNG ou WebP válida.' });
        }
        const extensoes = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
        let arquivoNovo;
        try {
            const perfil = await Baba.buscarMeuPerfil(req.params.codigo);
            if (!perfil) return res.status(404).json({ erro: 'Perfil de babá não encontrado.' });
            arquivoNovo = await salvarArquivo(req.params.codigo, req.file, extensoes[req.file.mimetype]);
            await Baba.atualizarFoto(req.params.codigo, arquivoNovo.relativo, req.file.mimetype, new Date().toISOString());
            await removerArquivo(perfil.foto);
            res.json({ mensagem: 'Foto de perfil atualizada.' });
        } catch (erro) {
            if (arquivoNovo) await removerArquivo(arquivoNovo.relativo);
            console.error('Não foi possível atualizar a foto de perfil.', erro.message);
            res.status(500).json({ erro: 'Não foi possível atualizar a foto de perfil.' });
        }
    },

    buscarCertidao: async (req, res) => {
        try {
            const perfil = await Baba.buscarMeuPerfil(req.params.codigo);
            const absoluto = caminhoUpload(perfil?.certidao_caminho);
            if (!perfil || !absoluto) return res.status(404).json({ erro: 'Certidão não encontrada.' });
            const pdf = await fs.readFile(absoluto);
            const nome = encodeURIComponent(perfil.certidao_nome || 'certidao.pdf');
            res.type('application/pdf')
                .set('Content-Disposition', `inline; filename*=UTF-8''${nome}`)
                .send(pdf);
        } catch (erro) {
            if (erro.code === 'ENOENT') return res.status(404).json({ erro: 'Certidão não encontrada.' });
            console.error('Não foi possível carregar a certidão.', erro.message);
            res.status(500).json({ erro: 'Não foi possível carregar a certidão.' });
        }
    },

    atualizarCertidao: async (req, res) => {
        if (!req.file || req.file.buffer.subarray(0, 5).toString() !== '%PDF-') {
            return res.status(400).json({ erro: 'Envie um documento PDF válido.' });
        }
        let arquivoNovo;
        try {
            const perfil = await Baba.buscarMeuPerfil(req.params.codigo);
            if (!perfil) return res.status(404).json({ erro: 'Perfil de babá não encontrado.' });
            const agora = new Date();
            const proximaAtualizacao = perfil.certidao_atualizada_em
                ? new Date(Date.parse(perfil.certidao_atualizada_em) + intervaloCertidaoMs)
                : null;
            if (proximaAtualizacao && proximaAtualizacao > agora) {
                return res.status(409).json({
                    erro: 'Você só pode atualizar a certidão a cada 1 segundo.',
                    proxima_atualizacao: proximaAtualizacao.toISOString()
                });
            }

            arquivoNovo = await salvarArquivo(req.params.codigo, req.file, '.pdf');
            const nome = path.basename(req.file.originalname.replace(/\\/g, '/'))
                .replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255) || 'certidao.pdf';
            const resultado = await Baba.atualizarCertidao(
                req.params.codigo, arquivoNovo.relativo, nome, agora.toISOString()
            );
            if (resultado.bloqueada) {
                await removerArquivo(arquivoNovo.relativo);
                return res.status(409).json({
                    erro: 'Você só pode atualizar a certidão a cada 1 segundo.',
                    proxima_atualizacao: resultado.proximaAtualizacao
                });
            }
            if (resultado.naoEncontrado) {
                await removerArquivo(arquivoNovo.relativo);
                return res.status(404).json({ erro: 'Perfil de babá não encontrado.' });
            }
            await removerArquivo(perfil.certidao_caminho);
            res.status(201).json({
                mensagem: 'Certidão atualizada.',
                certidao: { nome, atualizada_em: agora.toISOString(), proxima_atualizacao_em: new Date(agora.valueOf() + intervaloCertidaoMs).toISOString() }
            });
        } catch (erro) {
            if (arquivoNovo) await removerArquivo(arquivoNovo.relativo);
            console.error('Não foi possível atualizar a certidão.', erro.message);
            res.status(500).json({ erro: 'Não foi possível atualizar a certidão.' });
        }
    },

    buscarDiploma: async (req, res) => {
        try {
            const perfil = await Baba.buscarMeuPerfil(req.params.codigo);
            const absoluto = caminhoUpload(perfil?.diploma_caminho);
            if (!perfil || !absoluto) return res.status(404).json({ erro: 'Diploma não encontrado.' });
            const pdf = await fs.readFile(absoluto);
            const nome = encodeURIComponent(perfil.diploma_nome || 'diploma-cuidadora.pdf');
            res.type('application/pdf')
                .set('Content-Disposition', `inline; filename*=UTF-8''${nome}`)
                .send(pdf);
        } catch (erro) {
            if (erro.code === 'ENOENT') return res.status(404).json({ erro: 'Diploma não encontrado.' });
            console.error('Não foi possível carregar o diploma de cuidadora.', erro.message);
            res.status(500).json({ erro: 'Não foi possível carregar o diploma.' });
        }
    },

    atualizarDiploma: async (req, res) => {
        if (!req.file || req.file.buffer.subarray(0, 5).toString() !== '%PDF-') {
            return res.status(400).json({ erro: 'Envie um diploma de cuidadora infantil válido em PDF.' });
        }
        let arquivoNovo;
        try {
            const perfil = await Baba.buscarMeuPerfil(req.params.codigo);
            if (!perfil) return res.status(404).json({ erro: 'Perfil de babá não encontrado.' });
            arquivoNovo = await salvarArquivo(req.params.codigo, req.file, '.pdf');
            const nome = path.basename(req.file.originalname.replace(/\\/g, '/'))
                .replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255) || 'diploma.pdf';
            const resultado = await Baba.atualizarDiploma(
                req.params.codigo, arquivoNovo.relativo, nome, new Date().toISOString()
            );
            if (!resultado.changes) {
                await removerArquivo(arquivoNovo.relativo);
                return res.status(404).json({ erro: 'Perfil de babá não encontrado.' });
            }
            await removerArquivo(perfil.diploma_caminho);
            res.status(201).json({ mensagem: 'Diploma enviado para análise da administração.' });
        } catch (erro) {
            if (arquivoNovo) await removerArquivo(arquivoNovo.relativo);
            console.error('Não foi possível atualizar o diploma de cuidadora.', erro.message);
            res.status(500).json({ erro: 'Não foi possível atualizar o diploma.' });
        }
    },

    removerCertidao: async (req, res) => {
        try {
            const perfil = await Baba.buscarMeuPerfil(req.params.codigo);
            if (!perfil) return res.status(404).json({ erro: 'Perfil de babá não encontrado.' });
            if (!perfil.certidao_caminho) return res.status(404).json({ erro: 'Não há certidão para remover.' });

            const agora = new Date();
            const resultado = await Baba.removerCertidao(req.params.codigo, agora.toISOString());
            if (resultado.bloqueada) {
                return res.status(409).json({
                    erro: 'Você só pode alterar ou remover a certidão a cada 1 segundo.',
                    proxima_atualizacao: resultado.proximaAtualizacao
                });
            }
            if (resultado.naoEncontrado) return res.status(404).json({ erro: 'Perfil de babá não encontrado.' });
            if (resultado.semCertidao) return res.status(404).json({ erro: 'Não há certidão para remover.' });

            await removerArquivo(perfil.certidao_caminho);
            res.json({ mensagem: 'Certidão removida.', proxima_atualizacao: new Date(agora.valueOf() + intervaloCertidaoMs).toISOString() });
        } catch (erro) {
            console.error('Não foi possível remover a certidão.', erro.message);
            res.status(500).json({ erro: 'Não foi possível remover a certidão.' });
        }
    },

    buscarDisponibilidade: (req, res) => {
        Baba.buscarPorCodigo(req.params.codigo, async (erro, baba) => {
            if (erro) return res.status(500).json({ erro: 'Erro ao buscar perfil da babá.' });
            if (!baba) return res.status(404).json({ erro: 'Perfil de babá não encontrado.' });
            try {
                res.json(await Baba.listarDisponibilidade(req.params.codigo));
            } catch (erroConsulta) {
                res.status(500).json({ erro: 'Erro ao buscar disponibilidade.' });
            }
        });
    },

    salvarDisponibilidade: (req, res) => {
        if (req.sessao.perfil.tipo_usuario !== 'baba'
            || req.sessao.perfil.codigo_perfil !== req.params.codigo) {
            return res.status(403).json({ erro: 'Você só pode alterar sua própria disponibilidade.' });
        }
        const disponibilidade = req.body?.disponibilidade;
        if (!disponibilidadeValida(disponibilidade)) {
            return res.status(400).json({ erro: 'Informe os dias e horários de disponibilidade.' });
        }

        Baba.buscarPorCodigo(req.params.codigo, async (erro, baba) => {
            if (erro) return res.status(500).json({ erro: 'Erro ao buscar perfil da babá.' });
            if (!baba) return res.status(404).json({ erro: 'Perfil de babá não encontrado.' });
            try {
                await Baba.salvarDisponibilidade(req.params.codigo, disponibilidade);
                res.json({ mensagem: 'Disponibilidade atualizada com sucesso.' });
            } catch (erroAtualizacao) {
                res.status(500).json({ erro: 'Não foi possível salvar a disponibilidade.' });
            }
        });
    }
};

module.exports = babaController;