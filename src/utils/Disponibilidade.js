const diasDaSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const formatoHora = /^([01]\d|2[0-3]):[0-5]\d$/;

function disponibilidadeValida(disponibilidade) {
    if (!Array.isArray(disponibilidade) || disponibilidade.length < 1 || disponibilidade.length > 6) {
        return false;
    }

    const diasInformados = new Set();
    return disponibilidade.every((horario) => {
        if (!horario || !diasDaSemana.includes(horario.dia_semana) || diasInformados.has(horario.dia_semana)) {
            return false;
        }
        diasInformados.add(horario.dia_semana);
        return formatoHora.test(horario.hora_inicio)
            && formatoHora.test(horario.hora_fim)
            && horario.hora_inicio < horario.hora_fim;
    });
}

module.exports = disponibilidadeValida;
