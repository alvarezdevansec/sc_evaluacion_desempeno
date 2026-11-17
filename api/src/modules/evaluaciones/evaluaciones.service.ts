import { EvaluationError } from '../../errors/EvaluationError.js';
import { evaluacionesRepository } from './evaluaciones.repository.js';
import type { CrearSeguimientoInput, ActualizarOrdenSeguimientoInput, SeguimientoEvaluacion, TemporizadorEvaluacion } from './evaluaciones.types.js';
import type { GuardarEvaluacionInput, ActualizarEvaluacionInput } from './evaluaciones.types.js';

const VALID_EVALUATION_TYPES = [1, 2, 3];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DURACION_EVALUACION_SEGUNDOS = 20 * 60;

function validarEnteroPositivo(
    valor: number,
    campo: string
): void {
    if (!Number.isSafeInteger(valor) || valor <= 0) {
        throw new EvaluationError(`${campo} no es válido.`);
    }
}


function validarIdentificacionSeguimiento(
    idSesion: string,
    tipoEvaluacionId: number,
    idServidorPublico: number,
    idEvaluador: number | null
): void {

    if (!UUID_REGEX.test(idSesion)) {
        throw new EvaluationError(
            'El identificador de sesión no es válido.'
        );
    }

    if (!VALID_EVALUATION_TYPES.includes(tipoEvaluacionId)) {
        throw new EvaluationError(
            'El tipo de evaluación no es válido.'
        );
    }

    validarEnteroPositivo(
        idServidorPublico,
        'El servidor público'
    );

    if (tipoEvaluacionId === 2) {
        if (
            idEvaluador === null ||
            !Number.isSafeInteger(idEvaluador) ||
            idEvaluador <= 0
        ) {
            throw new EvaluationError(
                'La evaluación de subalternos requiere un evaluador válido.'
            );
        }

        if (idEvaluador === idServidorPublico) {
            throw new EvaluationError(
                'El evaluador no puede ser el mismo servidor evaluado.'
            );
        }
    } else if (idEvaluador !== null) {
        throw new EvaluationError(
            'Este tipo de evaluación no debe incluir un evaluador.'
        );
    }
}


function validarGuardarEvaluacion(
    input: GuardarEvaluacionInput
): void {

    if (!input || typeof input !== 'object') {
        throw new EvaluationError('Los datos de la respuesta son obligatorios.');
    }

    if (!UUID_REGEX.test(input.idSesion)) {
        throw new EvaluationError('El identificador de sesión no es válido.');
    }

    if (!VALID_EVALUATION_TYPES.includes(input.tipoEvaluacionId)) {
        throw new EvaluationError('El tipo de evaluación no es válido.');
    }

    validarEnteroPositivo(input.preguntaId, 'El identificador de pregunta');
    validarEnteroPositivo(input.respuestaId, 'El identificador de respuesta');
    validarEnteroPositivo(input.idServidorPublico, 'El servidor público');
    validarEnteroPositivo(input.idInstitucion, 'La institución');

    if (
        !Number.isInteger(input.puntaje) ||
        input.puntaje < 1 ||
        input.puntaje > 5
    ) {
        throw new EvaluationError('El puntaje debe estar entre 1 y 5.');
    }

    if (input.tipoEvaluacionId === 2) {
        if (
            input.idEvaluador === null ||
            !Number.isSafeInteger(input.idEvaluador) ||
            input.idEvaluador <= 0
        ) {
            throw new EvaluationError(
                'La evaluación de subalternos requiere un evaluador válido.'
            );
        }

        if (input.idEvaluador === input.idServidorPublico) {
            throw new EvaluationError(
                'El evaluador no puede ser el mismo servidor evaluado.'
            );
        }
    } else if (input.idEvaluador !== null) {
        throw new EvaluationError(
            'Este tipo de evaluación no debe incluir un evaluador.'
        );
    }
}

function validarActualizarEvaluacion(
    input: ActualizarEvaluacionInput
): void {

    if (!input || typeof input !== 'object') {
        throw new EvaluationError('Los datos de actualización son obligatorios.');
    }

    validarEnteroPositivo(input.respuestaId, 'El identificador de respuesta');

    if (
        !Number.isInteger(input.puntaje) ||
        input.puntaje < 1 ||
        input.puntaje > 5
    ) {
        throw new EvaluationError('El puntaje debe estar entre 1 y 5.');
    }
}

export const evaluacionesService = {

    async obtenerTipos() {
        return evaluacionesRepository.obtenerTipos();
    },

    async obtenerPreguntas(idEvaluacion: number) {
        validarEnteroPositivo(
            idEvaluacion,
            'El tipo de evaluación'
        );

        return evaluacionesRepository.obtenerPreguntas(idEvaluacion);
    },

    async obtenerEscalaLikert() {
        return evaluacionesRepository.obtenerEscalaLikert();
    },

    async crearSeguimiento(
        input: CrearSeguimientoInput
    ): Promise<SeguimientoEvaluacion> {

        if (!input || typeof input !== 'object') {
            throw new EvaluationError(
                'Los datos del seguimiento son obligatorios.'
            );
        }

        validarIdentificacionSeguimiento(
            input.idSesion,
            input.tipoEvaluacionId,
            input.idServidorPublico,
            input.idEvaluador
        );

        return evaluacionesRepository.crearSeguimiento(input);
    },

    async obtenerSeguimiento(
        idSesion: string,
        tipoEvaluacionId: number,
        idServidorPublico: number,
        idEvaluador: number | null
    ): Promise<SeguimientoEvaluacion | null> {

        validarIdentificacionSeguimiento(
            idSesion,
            tipoEvaluacionId,
            idServidorPublico,
            idEvaluador
        );

        return evaluacionesRepository.obtenerSeguimiento(
            idSesion,
            tipoEvaluacionId,
            idServidorPublico,
            idEvaluador
        );
    },

    async obtenerTemporizador(
        idSesion: string,
        tipoEvaluacionId: number,
        idServidorPublico: number,
        idEvaluador: number | null
    ): Promise<TemporizadorEvaluacion> {
        validarIdentificacionSeguimiento(
            idSesion,
            tipoEvaluacionId,
            idServidorPublico,
            idEvaluador
        );

        const temporizador = await evaluacionesRepository.obtenerTemporizador(
            idSesion,
            tipoEvaluacionId,
            idServidorPublico,
            idEvaluador,
            DURACION_EVALUACION_SEGUNDOS
        );

        if (!temporizador) {
            throw new EvaluationError(
                'No se encontró el seguimiento de evaluación.'
            );
        }

        return temporizador;
    },

    async reanudarSeguimiento(
        idSesion: string,
        tipoEvaluacionId: number,
        idServidorPublico: number,
        idEvaluador: number | null
    ): Promise<SeguimientoEvaluacion> {

        validarIdentificacionSeguimiento(
            idSesion,
            tipoEvaluacionId,
            idServidorPublico,
            idEvaluador
        );

        const seguimiento = await evaluacionesRepository.reanudarSeguimiento(
            idSesion,
            tipoEvaluacionId,
            idServidorPublico,
            idEvaluador,
            DURACION_EVALUACION_SEGUNDOS
        );

        if (!seguimiento) {
            throw new EvaluationError(
                'No se encontró el seguimiento de evaluación.'
            );
        }

        if (seguimiento.estado === 'FINALIZADA') {
            throw new EvaluationError(
                'La evaluación ya fue finalizada y no puede reanudarse.'
            );
        }

        if (seguimiento.estado !== 'EN PROCESO') {
            throw new EvaluationError(
                'No fue posible reanudar la evaluación.'
            );
        }

        return seguimiento;
    },


    async pausarSeguimiento(
        idSesion: string,
        tipoEvaluacionId: number,
        idServidorPublico: number,
        idEvaluador: number | null
    ): Promise<SeguimientoEvaluacion> {

        validarIdentificacionSeguimiento(
            idSesion,
            tipoEvaluacionId,
            idServidorPublico,
            idEvaluador
        );

        const seguimiento = await evaluacionesRepository.pausarSeguimiento(
            idSesion,
            tipoEvaluacionId,
            idServidorPublico,
            idEvaluador,
            DURACION_EVALUACION_SEGUNDOS
        );

        // Mantener las validaciones de estado existentes.

        if (!seguimiento) {
            throw new EvaluationError(
                'No se encontró el seguimiento de evaluación.'
            );
        }

        if (seguimiento.estado === 'FINALIZADA') {
            throw new EvaluationError(
                'La evaluación ya fue finalizada.'
            );
        }

        if (
            seguimiento.estado !== 'INICIADA' &&
            seguimiento.estado !== 'PAUSADA' &&
            seguimiento.estado !== 'EN PROCESO'
        ) {
            throw new EvaluationError(
                'No fue posible pausar la evaluación.'
            );
        }

        return seguimiento;
    },



    async actualizarOrdenSeguimiento(input: ActualizarOrdenSeguimientoInput): Promise<SeguimientoEvaluacion> {

        if (!input || typeof input !== 'object') {
            throw new EvaluationError('Los datos del seguimiento son obligatorios.');
        }

        validarIdentificacionSeguimiento(
            input.idSesion,
            input.tipoEvaluacionId,
            input.idServidorPublico,
            input.idEvaluador
        );


        if (!Array.isArray(input.preguntasOrdenadas) || input.preguntasOrdenadas.length === 0) {
            throw new EvaluationError('Debe proporcionar el orden de las preguntas.');
        }

        if (!Array.isArray(input.opcionesOrdenadas)) {
            throw new EvaluationError('El orden de las opciones no es válido.');
        }



        const preguntasInvalidas = input.preguntasOrdenadas.some(
            (id) => !Number.isSafeInteger(id) || id <= 0
        );

        if (preguntasInvalidas) {
            throw new EvaluationError('El orden contiene identificadores de preguntas no válidos.');
        }

        const preguntasDuplicadas = new Set(input.preguntasOrdenadas);

        if (preguntasDuplicadas.size !== input.preguntasOrdenadas.length) {
            throw new EvaluationError('El formulario contiene preguntas duplicadas.');
        }

        const opcionesInvalidas = input.opcionesOrdenadas.some(
            (item) =>
                !Number.isSafeInteger(item.preguntaId) ||
                item.preguntaId <= 0 ||
                !Array.isArray(item.respuestaIds) ||
                item.respuestaIds.some(
                    (id: number) => !Number.isSafeInteger(id) || id <= 0
                )
        );

        if (opcionesInvalidas) {
            throw new EvaluationError('El orden de las opciones contiene datos no válidos.');
        }

        const opcionesVacias = input.opcionesOrdenadas.some(
            (item) => item.respuestaIds.length === 0
        );

        if (opcionesVacias) {
            throw new EvaluationError(
                'Cada pregunta debe tener al menos una opción de respuesta.'
            );
        }

        const opcionesDuplicadas = input.opcionesOrdenadas.some(
            (item) =>
                new Set(item.respuestaIds).size !== item.respuestaIds.length
        );

        if (opcionesDuplicadas) {
            throw new EvaluationError(
                'El formulario contiene opciones de respuesta duplicadas.'
            );
        }

        const preguntasOrdenadasSet = new Set(input.preguntasOrdenadas);
        const preguntasOpcionesSet = new Set(
            input.opcionesOrdenadas.map((item) => item.preguntaId)
        );

        if (
            input.opcionesOrdenadas.some(
                (item) => !preguntasOrdenadasSet.has(item.preguntaId)
            ) ||
            preguntasOpcionesSet.size !== input.opcionesOrdenadas.length
        ) {
            throw new EvaluationError(
                'El orden de las opciones contiene preguntas duplicadas o no incluidas en el formulario.'
            );
        }

        const seguimiento = await evaluacionesRepository.actualizarOrdenSeguimiento(input);

        if (!seguimiento) {
            throw new EvaluationError(
                'No se encontró el seguimiento o la evaluación ya fue finalizada.'
            );
        }

        return seguimiento;
    },


    async marcarSeguimientoEnProceso(
        idSesion: string,
        tipoEvaluacionId: number,
        idServidorPublico: number,
        idEvaluador: number | null
    ): Promise<SeguimientoEvaluacion> {

        return this.reanudarSeguimiento(
            idSesion,
            tipoEvaluacionId,
            idServidorPublico,
            idEvaluador
        );
    },

    async finalizarSeguimiento(
        idSesion: string,
        tipoEvaluacionId: number,
        idServidorPublico: number,
        idEvaluador: number | null
    ): Promise<SeguimientoEvaluacion> {

        validarIdentificacionSeguimiento(
            idSesion,
            tipoEvaluacionId,
            idServidorPublico,
            idEvaluador
        );

        const seguimiento = await evaluacionesRepository.finalizarSeguimiento(
            idSesion,
            tipoEvaluacionId,
            idServidorPublico,
            idEvaluador,
            DURACION_EVALUACION_SEGUNDOS
        );

        if (seguimiento) {
            return seguimiento;
        }

        const existente = await evaluacionesRepository.obtenerSeguimiento(
            idSesion,
            tipoEvaluacionId,
            idServidorPublico,
            idEvaluador
        );

        if (existente?.estado === 'FINALIZADA') {
            return existente;
        }

        if (existente && existente.estado !== 'EN PROCESO') {
            throw new EvaluationError(
                'Solo se puede finalizar manualmente una evaluación que esté EN PROCESO.'
            );
        }

        throw new EvaluationError(
            'No se pudo finalizar el seguimiento de evaluación.'
        );
    },


    async guardarEvaluacion(input: GuardarEvaluacionInput) {

        validarGuardarEvaluacion(input);

        const operacion = await evaluacionesRepository.guardarRespuestaControlada(
            input,
            DURACION_EVALUACION_SEGUNDOS
        );

        if (operacion.estado === 'NO_ENCONTRADA') {
            throw new EvaluationError(
                'No existe un seguimiento iniciado para esta evaluación.'
            );
        }


        if (operacion.estado === 'PAUSADA') {
            throw new EvaluationError(
                'La evaluación está pausada. Debe reanudarla antes de registrar respuestas.'
            );
        }


        if (operacion.estado === 'FINALIZADA') {
            throw new EvaluationError(
                'No se pueden registrar respuestas en una evaluación finalizada.'
            );
        }

        if (operacion.estado === 'VENCIDA') {
            throw new EvaluationError(
                'El tiempo de evaluación ha finalizado. No se pueden registrar más respuestas.'
            );
        }

        return operacion.resultado!;
    },

    async obtenerPropietarioRespuesta(id: string) {
        if (!id?.trim()) {
            throw new EvaluationError('El identificador del registro es obligatorio.');
        }

        return evaluacionesRepository.obtenerPropietarioRespuesta(id);
    },

    async actualizarEvaluacion(
        id: string,
        input: ActualizarEvaluacionInput,
        propietario: {
            tipoEvaluacionId: number;
            idServidorPublico: number;
            idEvaluador: number | null;
            idInstitucion: number;
        }
    ) {

        if (!id?.trim()) {
            throw new EvaluationError(
                'El identificador del registro es obligatorio.'
            );
        }

        validarActualizarEvaluacion(input);

        const operacion = await evaluacionesRepository.actualizarRespuestaControlada(
            id,
            input,
            DURACION_EVALUACION_SEGUNDOS,
            propietario,
        );

        if (operacion.estado === 'NO_ENCONTRADA') {
            throw new EvaluationError(
                'No se encontró la respuesta o su seguimiento correspondiente.'
            );
        }


        if (operacion.estado === 'PAUSADA') {
            throw new EvaluationError(
                'La evaluación está pausada. Debe reanudarla antes de modificar respuestas.'
            );
        }

        if (operacion.estado === 'FINALIZADA') {
            throw new EvaluationError(
                'No se pueden modificar respuestas de una evaluación finalizada.'
            );
        }

        if (operacion.estado === 'VENCIDA') {
            throw new EvaluationError(
                'El tiempo de evaluación ha finalizado. No se pueden modificar respuestas.'
            );
        }

        if (
            operacion.estado !== 'ACTUALIZADA' ||
            !operacion.resultado
        ) {
            throw new EvaluationError(
                'No fue posible actualizar la respuesta de evaluación.'
            );
        }

        return operacion.resultado!;
    },

    async obtenerRespuestas(
        idSesion: string,
        tipoEvaluacionId: number,
        idServidorPublico: number,
        idEvaluador: number | null
    ) {
        validarIdentificacionSeguimiento(
            idSesion,
            tipoEvaluacionId,
            idServidorPublico,
            idEvaluador
        );

        return evaluacionesRepository.obtenerRespuestas(
            idSesion,
            tipoEvaluacionId,
            idServidorPublico,
            idEvaluador
        );
    },


    async obtenerServidorPorToken(token: string) {
        const tokenLimpio = token?.trim();

        if (!tokenLimpio) {
            throw new EvaluationError(
                'El token de acceso es obligatorio.'
            );
        }

        const servidor =
            await evaluacionesRepository.obtenerServidorPorToken(tokenLimpio);

        return servidor;
    },

    async obtenerSubalternos(token: string, idEvaluador: number) {
        const tokenLimpio = token?.trim();

        if (!tokenLimpio) {
            throw new EvaluationError(
                'El token de acceso es obligatorio.'
            );
        }

        validarEnteroPositivo(
            idEvaluador,
            'El identificador del evaluador'
        );

        const servidor =
            await evaluacionesRepository.obtenerServidorPorToken(tokenLimpio);

        if (!servidor) {
            throw new EvaluationError(
                'Token de acceso inválido.'
            );
        }

        if (![1, 2].includes(servidor.idEnlace)) {
            throw new EvaluationError(
                'El enlace no tiene autorización para evaluar subalternos.'
            );
        }

        if (servidor.idServidorPublico !== idEvaluador) {
            throw new EvaluationError(
                'El evaluador no corresponde al token proporcionado.'
            );
        }

        return evaluacionesRepository.obtenerSubalternos(
            servidor.idServidorPublico
        );
    },

    async obtenerDisponibilidadEvaluaciones(idServidorPublico: number) {
        validarEnteroPositivo(
            idServidorPublico,
            'El identificador del servidor público'
        );

        return evaluacionesRepository.obtenerDisponibilidadEvaluaciones(
            idServidorPublico
        );
    },

};
