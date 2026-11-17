
import type { EvaluationQuestion, EvaluationType, EvaluationTypeId, LikertOption, ServidorPublicoPorToken } from '@/types';

import { graphqlRequest } from '@/services/graphqlClient';
import {
  TIPOS_EVALUACION_QUERY,
  PREGUNTAS_EVALUACION_QUERY,
  ESCALA_LIKERT_QUERY,
  SERVIDOR_PUBLICO_POR_TOKEN_QUERY,
  SUBALTERNOS_EVALUACION_QUERY,
  RESPUESTAS_EVALUACION_QUERY,
  SAVE_EVALUACION_MUTATION,
  UPDATE_EVALUACION_MUTATION,
  CREAR_SEGUIMIENTO_MUTATION,
  SEGUIMIENTO_EVALUACION_QUERY,
  TEMPORIZADOR_EVALUACION_QUERY,
  ACTUALIZAR_ORDEN_SEGUIMIENTO_MUTATION,
  MARCAR_SEGUIMIENTO_EN_PROCESO_MUTATION,
  PAUSAR_SEGUIMIENTO_MUTATION,
  REANUDAR_SEGUIMIENTO_MUTATION,
  FINALIZAR_SEGUIMIENTO_MUTATION,
  EVALUATION_AVAILABILITY_QUERY
} from '@/services/evaluations.graphql';

const VALID_EVALUATION_TYPES = [1, 2, 3] as const;

interface TipoEvaluacionResponse {
  id: number;
  tipo: string;
  descripcion: string;
}

interface PreguntaEvaluacionResponse {
  id: number;
  idEvaluacion: number;
  pregunta: string;
}

interface EscalaLikertResponse {
  id: number;
  respuesta: string;
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

export interface ConsultarRespuestasInput {
  idSesion: string;
  tipoEvaluacionId: number;
  idServidorPublico: number;
  idEvaluador: number | null;
}

export interface CrearSeguimientoInput {
  idSesion: string;
  idServidorPublico: number;
  tipoEvaluacionId: number;
  idEvaluador: number | null;
}

export interface OpcionPreguntaOrdenada {
  preguntaId: number;
  respuestaIds: number[];
}

export type EstadoSeguimiento =
  | 'INICIADA'
  | 'EN PROCESO'
  | 'PAUSADA'
  | 'FINALIZADA';

export interface SeguimientoEvaluacion {
  id: string;
  idSesion: string;
  idServidorPublico: number;
  tipoEvaluacionId: number;
  estado: EstadoSeguimiento;
  preguntasOrdenadas: number[];
  opcionesOrdenadas: OpcionPreguntaOrdenada[];
  tiempoEvaluacion: number | null;
  fechaInicio: string;
  fechaFinalizacion: string | null;
}

export interface TemporizadorEvaluacion {
  tiempoTotal: number;
  tiempoTranscurrido: number;
  tiempoRestante: number;
  estado: EstadoSeguimiento;
  fechaInicio: string;
  fechaFinalizacion: string | null;
}

export interface ActualizarOrdenSeguimientoInput extends CrearSeguimientoInput {
  preguntasOrdenadas: number[];
  opcionesOrdenadas: OpcionPreguntaOrdenada[];
}

export interface ConsultarSeguimientoInput {
  idSesion: string;
  tipoEvaluacionId: number;
  idServidorPublico: number;
}

export interface SubalternoEvaluacion {
  idServidorPublico: number;
  idInstitucion: number;
  institucion: string;
  nombre: string;
  cargo: string;
  area: string | null;
  idEnlace: number;
  idEvaluador: number | null;
  estadoEvaluacion: 'EVALUADO' | 'PENDIENTE';
}

function validarTipoEvaluacion(id: number): EvaluationTypeId {
  if (!VALID_EVALUATION_TYPES.includes(id as (typeof VALID_EVALUATION_TYPES)[number])) {
    throw new Error(`Tipo de evaluación no válido: ${id}`);
  }
  return id as EvaluationTypeId;
}

function validarIdentificacionSeguimiento(input: ConsultarSeguimientoInput): void {
  if (typeof input.idSesion !== 'string' || !input.idSesion.trim()) {
    throw new Error('El identificador de sesión es obligatorio.');
  }

  // El backend valida el formato UUID. Esta comprobación evita enviar valores vacíos
  // o claramente inválidos desde el cliente sin duplicar toda la validación del servidor.
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(input.idSesion)) {
    throw new Error('El identificador de sesión no tiene un formato UUID válido.');
  }

  validarTipoEvaluacion(input.tipoEvaluacionId);

  if (!Number.isInteger(input.idServidorPublico) || input.idServidorPublico <= 0) {
    throw new Error('El identificador del servidor público debe ser un entero positivo.');
  }
}

function obtenerVariablesSeguimiento(input: ConsultarSeguimientoInput) {
  return {
    idSesion: input.idSesion,
    tipoEvaluacionId: input.tipoEvaluacionId,
    idServidorPublico: input.idServidorPublico,
  };
}


function validarTokenAcceso(token: string): string {
  const tokenLimpio = token?.trim();

  if (!tokenLimpio) {
    throw new Error('El token de acceso es obligatorio.');
  }

  return tokenLimpio;
}

/**
 * Obtiene el perfil del servidor público a partir de su token.
 * Esta función se utiliza desde la página dinámica del servidor.
 */
export async function obtenerServidorPublicoPorToken(
  token: string,
): Promise<ServidorPublicoPorToken | null> {
  const tokenLimpio = token?.trim();

  if (!tokenLimpio) {
    throw new Error('El token de acceso es obligatorio.');
  }

  const result = await graphqlRequest<{
    servidorPublicoPorToken: ServidorPublicoPorToken | null;
  }>(
    SERVIDOR_PUBLICO_POR_TOKEN_QUERY,
    { token: tokenLimpio },
    tokenLimpio,
  );

  return result.servidorPublicoPorToken;
}

/**
 * Obtiene los subalternos del propietario del token.
 * El backend debe validar la relación entre token e idEvaluador.
 */
export async function obtenerSubalternosEvaluacion(
  token: string,
  idEvaluador: number,
): Promise<SubalternoEvaluacion[]> {
  const tokenLimpio = token?.trim();

  if (!tokenLimpio) {
    throw new Error('El token de acceso es obligatorio.');
  }

  if (!Number.isInteger(idEvaluador) || idEvaluador <= 0) {
    throw new Error('El identificador del evaluador no es válido.');
  }

  const result = await graphqlRequest<{
    subalternosEvaluacion: SubalternoEvaluacion[];
  }>(
    SUBALTERNOS_EVALUACION_QUERY,
    { token: tokenLimpio },
    tokenLimpio,
  );

  return result.subalternosEvaluacion ?? [];
}

export async function getEvaluationTypes(): Promise<EvaluationType[]> {
  const result = await graphqlRequest<{
    tiposEvaluacion: TipoEvaluacionResponse[];
  }>(TIPOS_EVALUACION_QUERY);

  return result.tiposEvaluacion.map((item) => ({
    id: validarTipoEvaluacion(item.id),
    tipo: item.tipo,
    descripcion: item.descripcion,
  }));
}

export async function getEvaluationQuestions(
  idEvaluacion: EvaluationTypeId,
): Promise<EvaluationQuestion[]> {
  const result = await graphqlRequest<{
    preguntasEvaluacion: PreguntaEvaluacionResponse[];
  }>(PREGUNTAS_EVALUACION_QUERY, { idEvaluacion });

  return result.preguntasEvaluacion.map((item) => ({
    id: item.id,
    idEvaluacion: validarTipoEvaluacion(item.idEvaluacion),
    pregunta: item.pregunta,
  }));
}

export async function getLikertOptions(): Promise<LikertOption[]> {
  const result = await graphqlRequest<{
    escalaLikert: EscalaLikertResponse[];
  }>(ESCALA_LIKERT_QUERY);

  return result.escalaLikert.map((item) => ({
    id: item.id,
    respuesta: item.respuesta,
    puntaje: item.puntaje,
  }));
}

export async function getEvaluationAnswers(
  input: ConsultarRespuestasInput,
  token: string,
): Promise<ResultadoEvaluacion[]> {
  token = validarTokenAcceso(token);
  validarIdentificacionSeguimiento(input);

  const result = await graphqlRequest<{
    respuestasEvaluacion: ResultadoEvaluacion[];
  }>(
    RESPUESTAS_EVALUACION_QUERY,
    {
      idSesion: input.idSesion,
      tipoEvaluacionId: input.tipoEvaluacionId,
      idServidorPublico: input.idServidorPublico,
    },
    token,
  );

  return result.respuestasEvaluacion;
}

export async function saveEvaluationAnswer(
  input: GuardarEvaluacionInput,
  token: string,
): Promise<ResultadoEvaluacion> {
  token = validarTokenAcceso(token);
  validarIdentificacionSeguimiento(input);

  const {
    idEvaluador: _idEvaluador,
    idInstitucion: _idInstitucion,
    ...graphqlInput
  } = input;

  const result = await graphqlRequest<{
    saveEvaluacion: ResultadoEvaluacion | null;
  }>(
    SAVE_EVALUACION_MUTATION,
    {
      input: graphqlInput,
    },
    token,
  );

  const respuesta = result.saveEvaluacion;

  if (!respuesta || !respuesta.id) {
    throw new Error(
      'La API no confirmó el registro de la respuesta de evaluación.',
    );
  }

  return respuesta;
}

export async function updateEvaluationAnswer(
  id: string,
  input: ActualizarEvaluacionInput,
  token: string,
): Promise<ResultadoEvaluacion> {
  token = validarTokenAcceso(token);

  if (!id?.trim()) {
    throw new Error('El ID del resultado de evaluación es obligatorio.');
  }

  const result = await graphqlRequest<{
    updateEvaluacion: ResultadoEvaluacion;
  }>(UPDATE_EVALUACION_MUTATION, { id, input }, token);

  return result.updateEvaluacion;
}

export async function actualizarOrdenSeguimiento(
  input: ActualizarOrdenSeguimientoInput,
  token: string,
): Promise<SeguimientoEvaluacion> {
  token = validarTokenAcceso(token);
  validarIdentificacionSeguimiento(input);

  if (!Array.isArray(input.preguntasOrdenadas) || input.preguntasOrdenadas.length === 0) {
    throw new Error('Debe proporcionar el orden de las preguntas.');
  }

  if (!Array.isArray(input.opcionesOrdenadas)) {
    throw new Error('Debe proporcionar el orden de las opciones.');
  }

  const { idEvaluador, ...graphqlInput } = input;

  const result = await graphqlRequest<{
    actualizarOrdenSeguimiento: SeguimientoEvaluacion;
  }>(ACTUALIZAR_ORDEN_SEGUIMIENTO_MUTATION, {
    input: graphqlInput,
  }, token);

  return result.actualizarOrdenSeguimiento;
}

export async function crearSeguimiento(
  input: CrearSeguimientoInput,
  token: string,
): Promise<SeguimientoEvaluacion> {
  token = validarTokenAcceso(token);
  validarIdentificacionSeguimiento(input);

  const { idEvaluador, ...graphqlInput } = input;

  const result = await graphqlRequest<{
    crearSeguimiento: SeguimientoEvaluacion;
  }>(CREAR_SEGUIMIENTO_MUTATION, {
    input: graphqlInput,
  }, token);

  return result.crearSeguimiento;
}

export async function obtenerSeguimiento(
  input: ConsultarSeguimientoInput,
  token: string,
): Promise<SeguimientoEvaluacion | null> {
  token = validarTokenAcceso(token);
  validarIdentificacionSeguimiento(input);

  const result = await graphqlRequest<{
    seguimientoEvaluacion: SeguimientoEvaluacion | null;
  }>(SEGUIMIENTO_EVALUACION_QUERY, obtenerVariablesSeguimiento(input), token);

  return result.seguimientoEvaluacion;
}

export async function obtenerTemporizador(
  input: ConsultarSeguimientoInput,
  token: string,
): Promise<TemporizadorEvaluacion> {
  token = validarTokenAcceso(token);
  validarIdentificacionSeguimiento(input);

  const result = await graphqlRequest<{
    temporizadorEvaluacion: TemporizadorEvaluacion;
  }>(TEMPORIZADOR_EVALUACION_QUERY, obtenerVariablesSeguimiento(input), token);

  return result.temporizadorEvaluacion;
}

export async function marcarSeguimientoEnProceso(
  input: ConsultarSeguimientoInput,
  token: string,
): Promise<SeguimientoEvaluacion> {
  token = validarTokenAcceso(token);
  validarIdentificacionSeguimiento(input);

  const result = await graphqlRequest<{
    marcarSeguimientoEnProceso: SeguimientoEvaluacion;
  }>(
    MARCAR_SEGUIMIENTO_EN_PROCESO_MUTATION,
    obtenerVariablesSeguimiento(input),
    token,
  );

  return result.marcarSeguimientoEnProceso;
}

export async function pausarSeguimiento(
  input: ConsultarSeguimientoInput,
  token: string,
): Promise<SeguimientoEvaluacion> {
  token = validarTokenAcceso(token);
  validarIdentificacionSeguimiento(input);

  const result = await graphqlRequest<{
    pausarSeguimiento: SeguimientoEvaluacion;
  }>(PAUSAR_SEGUIMIENTO_MUTATION, obtenerVariablesSeguimiento(input), token);

  return result.pausarSeguimiento;
}

export async function reanudarSeguimiento(
  input: ConsultarSeguimientoInput,
  token: string,
): Promise<SeguimientoEvaluacion> {
  token = validarTokenAcceso(token);
  validarIdentificacionSeguimiento(input);

  const result = await graphqlRequest<{
    reanudarSeguimiento: SeguimientoEvaluacion;
  }>(REANUDAR_SEGUIMIENTO_MUTATION, obtenerVariablesSeguimiento(input), token);

  return result.reanudarSeguimiento;
}

export async function finalizarSeguimiento(
  input: ConsultarSeguimientoInput,
  token: string,
): Promise<SeguimientoEvaluacion> {
  token = validarTokenAcceso(token);
  validarIdentificacionSeguimiento(input);

  const result = await graphqlRequest<{
    finalizarSeguimiento: SeguimientoEvaluacion;
  }>(FINALIZAR_SEGUIMIENTO_MUTATION, obtenerVariablesSeguimiento(input), token);

  return result.finalizarSeguimiento;
}


export interface EvaluationAvailability {
  autoevaluacionRealizada: boolean;
  subalternosEvaluados: number;
  totalSubalternos: number;
  evaluacionInstitucionalRealizada: boolean;
}

export async function getEvaluationAvailability(
  token: string,
): Promise<EvaluationAvailability> {
  const tokenLimpio = validarTokenAcceso(token);

  const result = await graphqlRequest<{
    evaluationAvailability: EvaluationAvailability;
  }>(
    EVALUATION_AVAILABILITY_QUERY,
    {},
    tokenLimpio,
  );

  return result.evaluationAvailability;
}