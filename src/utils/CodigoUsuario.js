const { randomInt } = require('crypto');

function gerarCodigoUsuario() {
    return randomInt(100000000000, 1000000000000).toString();
}

module.exports = gerarCodigoUsuario;
