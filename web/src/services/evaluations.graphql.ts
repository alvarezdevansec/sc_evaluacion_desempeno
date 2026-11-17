
export const TIPOS_EVALUACION_QUERY = `
  query TiposEvaluacion {
    tiposEvaluacion {
      id
      tipo
      descripcion
    }
  }
`;

export const PREGUNTAS_EVALUACION_QUERY = `
  query PreguntasEvaluacion($idEvaluacion: Int!) {
    preguntasEvaluacion(idEvaluacion: $idEvaluacion) {
      id
      idEvaluacion
      pregunta
    }
  }
`;

export const ESCALA_LIKERT_QUERY = `
  query EscalaLikert {
    escalaLikert {
      id
      respuesta
      puntaje
    }
  }
`;

export const SERVIDOR_PUBLICO_POR_TOKEN_QUERY = `
  query ServidorPublicoPorToken($token: String!) {
    servidorPublicoPorToken(token: $token) {
      idServidorPublico
      idInstitucion
      institucion
      nombre
      cargo
      area
      idEnlace
      idEvaluador
    }
  }
`;


export const SUBALTERNOS_EVALUACION_QUERY = `
  query SubalternosEvaluacion {
    subalternosEvaluacion {
      idServidorPublico
      idInstitucion
      institucion
      nombre
      cargo
      area
      idEnlace
      idEvaluador
      estadoEvaluacion
    }
  }
`;


export const RESPUESTAS_EVALUACION_QUERY = `
  query RespuestasEvaluacion(
    $idSesion: String!
    $tipoEvaluacionId: Int!
    $idServidorPublico: Int!
  ) {
    respuestasEvaluacion(
      idSesion: $idSesion
      tipoEvaluacionId: $tipoEvaluacionId
      idServidorPublico: $idServidorPublico
    ) {
      id
      idSesion
      tipoEvaluacionId
      preguntaId
      respuestaId
      puntaje
      idServidorPublico
      idEvaluador
      idInstitucion
    }
  }
`;

export const SAVE_EVALUACION_MUTATION = `
  mutation SaveEvaluacion($input: GuardarEvaluacionInput!) {
    saveEvaluacion(input: $input) {
      id
      idSesion
      tipoEvaluacionId
      preguntaId
      respuestaId
      puntaje
      idServidorPublico
      idEvaluador
      idInstitucion
    }
  }
`;

export const UPDATE_EVALUACION_MUTATION = `
  mutation UpdateEvaluacion(
    $id: ID!
    $input: ActualizarEvaluacionInput!
  ) {
    updateEvaluacion(id: $id, input: $input) {
      id
      idSesion
      tipoEvaluacionId
      preguntaId
      respuestaId
      puntaje
      idServidorPublico
      idEvaluador
      idInstitucion
    }
  }
`;


export const CREAR_SEGUIMIENTO_MUTATION = `
  mutation CrearSeguimiento($input: CrearSeguimientoInput!) {
    crearSeguimiento(input: $input) {
      id
      idSesion
      idServidorPublico
      idEvaluador
      tipoEvaluacionId
      estado
      preguntasOrdenadas
      opcionesOrdenadas {
        preguntaId
        respuestaIds
      }
      tiempoEvaluacion
      fechaInicio
      fechaFinalizacion
    }
  }
`;

export const SEGUIMIENTO_EVALUACION_QUERY = `
  query SeguimientoEvaluacion(
    $idSesion: String!
    $tipoEvaluacionId: Int!
    $idServidorPublico: Int!
  ) {
    seguimientoEvaluacion(
      idSesion: $idSesion
      tipoEvaluacionId: $tipoEvaluacionId
      idServidorPublico: $idServidorPublico
    ) {
      id
      idSesion
      idServidorPublico
      idEvaluador
      tipoEvaluacionId
      estado
      preguntasOrdenadas
      opcionesOrdenadas {
        preguntaId
        respuestaIds
      }
      tiempoEvaluacion
      fechaInicio
      fechaFinalizacion
    }
  }
`;

export const TEMPORIZADOR_EVALUACION_QUERY = `
  query TemporizadorEvaluacion(
    $idSesion: String!
    $tipoEvaluacionId: Int!
    $idServidorPublico: Int!
  ) {
    temporizadorEvaluacion(
      idSesion: $idSesion
      tipoEvaluacionId: $tipoEvaluacionId
      idServidorPublico: $idServidorPublico
    ) {
      tiempoTotal
      tiempoTranscurrido
      tiempoRestante
      estado
      fechaInicio
      fechaFinalizacion
    }
  }
`;

export const ACTUALIZAR_ORDEN_SEGUIMIENTO_MUTATION = `
  mutation ActualizarOrdenSeguimiento(
    $input: ActualizarOrdenSeguimientoInput!
  ) {
    actualizarOrdenSeguimiento(input: $input) {
      id
      idSesion
      idServidorPublico
      idEvaluador
      tipoEvaluacionId
      estado
      preguntasOrdenadas
      opcionesOrdenadas {
        preguntaId
        respuestaIds
      }
      tiempoEvaluacion
      fechaInicio
      fechaFinalizacion
    }
  }
`;

export const FINALIZAR_SEGUIMIENTO_MUTATION = `
  mutation FinalizarSeguimiento(
    $idSesion: String!
    $tipoEvaluacionId: Int!
    $idServidorPublico: Int!
  ) {
    finalizarSeguimiento(
      idSesion: $idSesion
      tipoEvaluacionId: $tipoEvaluacionId
      idServidorPublico: $idServidorPublico
    ) {
      id
      idSesion
      idServidorPublico
      idEvaluador
      tipoEvaluacionId
      estado
      tiempoEvaluacion
      fechaInicio
      fechaFinalizacion
    }
  }
`;


export const MARCAR_SEGUIMIENTO_EN_PROCESO_MUTATION = `
    mutation MarcarSeguimientoEnProceso(
        $idSesion: String!
        $tipoEvaluacionId: Int!
        $idServidorPublico: Int!
    ) {
        marcarSeguimientoEnProceso(
            idSesion: $idSesion
            tipoEvaluacionId: $tipoEvaluacionId
            idServidorPublico: $idServidorPublico
        ) {
            id
            idSesion
            idServidorPublico
            idEvaluador
            tipoEvaluacionId
            estado
            tiempoEvaluacion
            fechaInicio
            fechaFinalizacion
        }
    }
`;

export const PAUSAR_SEGUIMIENTO_MUTATION = `
    mutation PausarSeguimiento(
        $idSesion: String!
        $tipoEvaluacionId: Int!
        $idServidorPublico: Int!
    ) {
        pausarSeguimiento(
            idSesion: $idSesion
            tipoEvaluacionId: $tipoEvaluacionId
            idServidorPublico: $idServidorPublico
        ) {
            id
            idSesion
            idServidorPublico
            idEvaluador
            tipoEvaluacionId
            estado
            tiempoEvaluacion
            fechaInicio
            fechaFinalizacion
        }
    }
`;

export const REANUDAR_SEGUIMIENTO_MUTATION = `
    mutation ReanudarSeguimiento(
        $idSesion: String!
        $tipoEvaluacionId: Int!
        $idServidorPublico: Int!
    ) {
        reanudarSeguimiento(
            idSesion: $idSesion
            tipoEvaluacionId: $tipoEvaluacionId
            idServidorPublico: $idServidorPublico
        ) {
            id
            idSesion
            idServidorPublico
            idEvaluador
            tipoEvaluacionId
            estado
            tiempoEvaluacion
            fechaInicio
            fechaFinalizacion
        }
    }
`;


export const EVALUATION_AVAILABILITY_QUERY = `
  query EvaluationAvailability {
    evaluationAvailability {
      autoevaluacionRealizada
      subalternosEvaluados
      totalSubalternos
      evaluacionInstitucionalRealizada
    }
  }
`;