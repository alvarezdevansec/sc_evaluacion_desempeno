
import { evaluacionesService } from './evaluaciones.service.js';

import type {
    GuardarEvaluacionInput,
    ActualizarEvaluacionInput,
    CrearSeguimientoInput,
    ActualizarOrdenSeguimientoInput,
    ServidorPublicoPorToken,
    SubalternoEvaluacion,
} from './evaluaciones.types.js';

import type { GraphQLContext } from '../../auth/auth.types.js';

import {
    validarServidorEvaluado,
} from './evaluaciones.permissions.js';

import { EvaluationError } from '../../errors/EvaluationError.js';

interface GuardarEvaluacionArgs {
    input: GuardarEvaluacionInput;
}

interface ActualizarEvaluacionArgs {
    id: string;
    input: ActualizarEvaluacionInput;
}

interface RespuestasEvaluacionArgs {
    idSesion: string;
    tipoEvaluacionId: number;
    idServidorPublico: number;
}

interface CrearSeguimientoArgs {
    input: CrearSeguimientoInput;
}

interface ActualizarOrdenSeguimientoArgs {
    input: ActualizarOrdenSeguimientoInput;
}

interface SeguimientoEvaluacionArgs {
    idSesion: string;
    tipoEvaluacionId: number;
    idServidorPublico: number;
}
interface ServidorPublicoPorTokenArgs {
    token: string;
}

interface SubalternosEvaluacionArgs {
    token: string;
}

function obtenerUsuarioAutenticado(context: GraphQLContext) {
    if (!context.user) {
        throw new EvaluationError(
            'Debe autenticarse para realizar esta operación.',
        );
    }

    return context.user;
}

async function validarAccesoEvaluacion(
    context: GraphQLContext,
    tipoEvaluacionId: number,
    idServidorPublico: number,
) {
    const usuario = obtenerUsuarioAutenticado(context);

    await validarServidorEvaluado(
        usuario,
        tipoEvaluacionId,
        idServidorPublico,
    );

    return usuario;
}

export const evaluacionesResolvers = {

    Query: {

        // Consultas públicas.
        tiposEvaluacion: () =>
            evaluacionesService.obtenerTipos(),

        preguntasEvaluacion: (
            _: unknown,
            args: { idEvaluacion: number },
        ) =>
            evaluacionesService.obtenerPreguntas(args.idEvaluacion),

        escalaLikert: () =>
            evaluacionesService.obtenerEscalaLikert(),

        // Consultas protegidas.
        respuestasEvaluacion: async (
            _: unknown,
            args: RespuestasEvaluacionArgs,
            context: GraphQLContext,
        ) => {
            const usuario = await validarAccesoEvaluacion(
                context,
                args.tipoEvaluacionId,
                args.idServidorPublico,
            );

            const idEvaluador =
                args.tipoEvaluacionId === 2
                    ? usuario.idServidorPublico
                    : null;

            return evaluacionesService.obtenerRespuestas(
                args.idSesion,
                args.tipoEvaluacionId,
                args.idServidorPublico,
                idEvaluador,
            );
        },

        seguimientoEvaluacion: async (
            _: unknown,
            args: SeguimientoEvaluacionArgs,
            context: GraphQLContext,
        ) => {
            const usuario = await validarAccesoEvaluacion(
                context,
                args.tipoEvaluacionId,
                args.idServidorPublico,
            );

            const idEvaluador =
                args.tipoEvaluacionId === 2
                    ? usuario.idServidorPublico
                    : null;

            return evaluacionesService.obtenerSeguimiento(
                args.idSesion,
                args.tipoEvaluacionId,
                args.idServidorPublico,
                idEvaluador,
            );
        },

        temporizadorEvaluacion: async (
            _: unknown,
            args: SeguimientoEvaluacionArgs,
            context: GraphQLContext,
        ) => {
            const usuario = await validarAccesoEvaluacion(
                context,
                args.tipoEvaluacionId,
                args.idServidorPublico,
            );

            const idEvaluador =
                args.tipoEvaluacionId === 2
                    ? usuario.idServidorPublico
                    : null;

            return evaluacionesService.obtenerTemporizador(
                args.idSesion,
                args.tipoEvaluacionId,
                args.idServidorPublico,
                idEvaluador,
            );
        },
        servidorPublicoPorToken: (
            _: unknown,
            args: ServidorPublicoPorTokenArgs,
        ): Promise<ServidorPublicoPorToken | null> =>
            evaluacionesService.obtenerServidorPorToken(args.token),

        subalternosEvaluacion: (
            _: unknown,
            __: unknown,
            context: GraphQLContext,
        ): Promise<SubalternoEvaluacion[]> => {
            const usuario = obtenerUsuarioAutenticado(context);

            if (![1, 2].includes(usuario.idEnlace)) {
                throw new Error(
                    'El enlace no tiene autorización para evaluar subalternos.'
                );
            }

            if (!context.token) {
                throw new Error('El token de acceso es obligatorio.');
            }

            return evaluacionesService.obtenerSubalternos(
                context.token,
                usuario.idServidorPublico,
            );
        },

        evaluationAvailability: (
            _: unknown,
            __: unknown,
            context: GraphQLContext,
        ) => {
            const usuario = obtenerUsuarioAutenticado(context);

            return evaluacionesService.obtenerDisponibilidadEvaluaciones(
                usuario.idServidorPublico
            );
        },

    },

    Mutation: {

        saveEvaluacion: async (
            _: unknown,
            args: GuardarEvaluacionArgs,
            context: GraphQLContext,
        ) => {
            const usuario = await validarAccesoEvaluacion(
                context,
                args.input.tipoEvaluacionId,
                args.input.idServidorPublico,
            );

            return evaluacionesService.guardarEvaluacion({
                ...args.input,

                // Los datos de identidad provienen del contexto.
                idInstitucion: usuario.idInstitucion,

                idEvaluador:
                    args.input.tipoEvaluacionId === 2
                        ? usuario.idServidorPublico
                        : null,
            });
        },

        updateEvaluacion: async (
            _: unknown,
            args: ActualizarEvaluacionArgs,
            context: GraphQLContext,
        ) => {
            const usuario = obtenerUsuarioAutenticado(context);
            const propietario = await evaluacionesService.obtenerPropietarioRespuesta(args.id);

            if (!propietario) {
                throw new EvaluationError('No se encontró la respuesta que desea actualizar.');
            }

            await validarServidorEvaluado(
                usuario,
                propietario.tipoEvaluacionId,
                propietario.idServidorPublico,
            );

            if (propietario.idInstitucion !== usuario.idInstitucion) {
                throw new EvaluationError('No tiene autorización para modificar respuestas de otra institución.');
            }

            const idEvaluadorEsperado =
                propietario.tipoEvaluacionId === 2
                    ? usuario.idServidorPublico
                    : null;

            if (propietario.idEvaluador !== idEvaluadorEsperado) {
                throw new EvaluationError('La respuesta no pertenece al evaluador autenticado.');
            }

            return evaluacionesService.actualizarEvaluacion(
                args.id,
                args.input,
                { ...propietario, idEvaluador: idEvaluadorEsperado },
            );
        },

        crearSeguimiento: async (
            _: unknown,
            args: CrearSeguimientoArgs,
            context: GraphQLContext,
        ) => {
            const usuario = await validarAccesoEvaluacion(
                context,
                args.input.tipoEvaluacionId,
                args.input.idServidorPublico,
            );

            return evaluacionesService.crearSeguimiento({
                ...args.input,
                idEvaluador:
                    args.input.tipoEvaluacionId === 2
                        ? usuario.idServidorPublico
                        : null,
            });
        },

        marcarSeguimientoEnProceso: async (
            _: unknown,
            args: SeguimientoEvaluacionArgs,
            context: GraphQLContext,
        ) => {
            const usuario = await validarAccesoEvaluacion(
                context,
                args.tipoEvaluacionId,
                args.idServidorPublico,
            );

            const idEvaluador =
                args.tipoEvaluacionId === 2
                    ? usuario.idServidorPublico
                    : null;

            return evaluacionesService.marcarSeguimientoEnProceso(
                args.idSesion,
                args.tipoEvaluacionId,
                args.idServidorPublico,
                idEvaluador,
            );
        },

        pausarSeguimiento: async (
            _: unknown,
            args: SeguimientoEvaluacionArgs,
            context: GraphQLContext,
        ) => {
            const usuario = await validarAccesoEvaluacion(
                context,
                args.tipoEvaluacionId,
                args.idServidorPublico,
            );

            const idEvaluador =
                args.tipoEvaluacionId === 2
                    ? usuario.idServidorPublico
                    : null;

            return evaluacionesService.pausarSeguimiento(
                args.idSesion,
                args.tipoEvaluacionId,
                args.idServidorPublico,
                idEvaluador,
            );
        },

        reanudarSeguimiento: async (
            _: unknown,
            args: SeguimientoEvaluacionArgs,
            context: GraphQLContext,
        ) => {
            const usuario = await validarAccesoEvaluacion(
                context,
                args.tipoEvaluacionId,
                args.idServidorPublico,
            );

            const idEvaluador =
                args.tipoEvaluacionId === 2
                    ? usuario.idServidorPublico
                    : null;

            return evaluacionesService.reanudarSeguimiento(
                args.idSesion,
                args.tipoEvaluacionId,
                args.idServidorPublico,
                idEvaluador,
            );
        },

        finalizarSeguimiento: async (
            _: unknown,
            args: SeguimientoEvaluacionArgs,
            context: GraphQLContext,
        ) => {
            const usuario = await validarAccesoEvaluacion(
                context,
                args.tipoEvaluacionId,
                args.idServidorPublico,
            );

            const idEvaluador =
                args.tipoEvaluacionId === 2
                    ? usuario.idServidorPublico
                    : null;

            return evaluacionesService.finalizarSeguimiento(
                args.idSesion,
                args.tipoEvaluacionId,
                args.idServidorPublico,
                idEvaluador,
            );
        },

        actualizarOrdenSeguimiento: async (
            _: unknown,
            args: ActualizarOrdenSeguimientoArgs,
            context: GraphQLContext,
        ) => {
            const usuario = await validarAccesoEvaluacion(
                context,
                args.input.tipoEvaluacionId,
                args.input.idServidorPublico,
            );

            return evaluacionesService.actualizarOrdenSeguimiento({
                ...args.input,
                idEvaluador:
                    args.input.tipoEvaluacionId === 2
                        ? usuario.idServidorPublico
                        : null,
            });
        },

    }
};
