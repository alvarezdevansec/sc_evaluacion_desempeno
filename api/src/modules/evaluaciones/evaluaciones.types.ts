export type EvaluationTypeId = 1 | 2 | 3;

export interface TipoEvaluacion {
    id: EvaluationTypeId;
    tipo: string;
    descripcion: string;
}

export interface PreguntaEvaluacion {
    id: number;
    idEvaluacion: number;
    pregunta: string;
}

export interface EscalaLikert {
    id: number;
    respuesta: string;
    puntaje: number;
}

export interface GuardarEvaluacionInput {
    idSesion: string;
    tipoEvaluacionId: number;
    preguntaId: number;
    respuestaId: number;
    puntaje: number;
    idServidorPublico: number;
    idEvaluador: number | null;
    idInstitucion: number;
}

export interface ActualizarEvaluacionInput {
    respuestaId: number;
    puntaje: number;
}

export interface ResultadoEvaluacion {
    id: string;
    idSesion: string;
    tipoEvaluacionId: number;
    preguntaId: number;
    respuestaId: number;
    puntaje: number;
    idServidorPublico: number;
    idEvaluador: number | null;
    idInstitucion: number;
}

export type EstadoSeguimiento =
    | 'INICIADA'
    | 'EN PROCESO'
    | 'PAUSADA'
    | 'FINALIZADA';

export interface OpcionPreguntaOrdenada {
    preguntaId: number;
    respuestaIds: number[];
}

export interface SeguimientoEvaluacion {
    id: string;
    idSesion: string;
    idServidorPublico: number;
    tipoEvaluacionId: number;
    idEvaluador: number | null;
    estado: EstadoSeguimiento;
    preguntasOrdenadas: number[];
    opcionesOrdenadas: OpcionPreguntaOrdenada[];
    tiempoEvaluacion: number | null;
    fechaInicio: string;
    fechaUltimaReanudacion: string | null;
    fechaFinalizacion: string | null;
}

export interface CrearSeguimientoInput {
    idSesion: string;
    tipoEvaluacionId: number;
    idServidorPublico: number;
    idEvaluador: number | null;
}

export interface ActualizarOrdenSeguimientoInput {
    idSesion: string;
    tipoEvaluacionId: number;
    idServidorPublico: number;
    idEvaluador: number | null;
    preguntasOrdenadas: number[];
    opcionesOrdenadas: OpcionPreguntaOrdenada[];
}

export interface TemporizadorEvaluacion {
    tiempoTotal: number;
    tiempoTranscurrido: number;
    tiempoRestante: number;
    estado: EstadoSeguimiento;
    fechaInicio: string;
    fechaUltimaReanudacion: string | null;
    fechaFinalizacion: string | null;
}

export type ResultadoOperacionEvaluacion =
    | {
        estado: 'GUARDADA' | 'ACTUALIZADA';
        resultado: ResultadoEvaluacion;
    }
    | {
        estado: 'FINALIZADA' | 'VENCIDA' | 'PAUSADA' | 'NO_ENCONTRADA';
        resultado: null;
    };

export interface ServidorPublicoPorToken {
    idServidorPublico: number;
    idInstitucion: number;
    institucion: string;
    dni: string;
    nombre: string;
    cargo: string;
    area: string | null;
    correo: string | null;
    idEnlace: number;
    idEvaluador: number | null;
    linked: string | null;
}

export type EstadoEvaluacionSubalterno =
    | 'EVALUADO'
    | 'PENDIENTE';

export interface SubalternoEvaluacion {
    idServidorPublico: number;
    idInstitucion: number;
    institucion: string;
    dni: string;
    nombre: string;
    cargo: string;
    area: string | null;
    correo: string | null;
    idEnlace: number;
    idEvaluador: number | null;
    estadoEvaluacion: EstadoEvaluacionSubalterno;
}
