const multer = require('multer');

function criarUpload(campo, tiposPermitidos, limiteBytes) {
    const processar = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: limiteBytes, fieldSize: 32 * 1024, fields: 1 },
        fileFilter: (req, arquivo, callback) => {
            if (!tiposPermitidos.has(arquivo.mimetype)) {
                const erro = new Error('Formato de arquivo não permitido.');
                erro.status = 415;
                return callback(erro);
            }
            callback(null, true);
        }
    }).single(campo);

    return (req, res, next) => {
        processar(req, res, (erro) => {
            if (!erro) return next();
            const status = erro.code === 'LIMIT_FILE_SIZE' ? 413 : erro.status || 400;
            res.status(status).json({ erro: erro.message || 'Não foi possível receber o arquivo.' });
        });
    };
}

module.exports = {
    foto: criarUpload('foto', new Set(['image/jpeg', 'image/png', 'image/webp']), 5 * 1024 * 1024),
    certidao: criarUpload('certidao', new Set(['application/pdf']), 10 * 1024 * 1024),
    diploma: criarUpload('diploma', new Set(['application/pdf']), 10 * 1024 * 1024)
};
