
import { gql } from 'graphql-tag';

export const evaluacionesTypeDefs = gql`
  type TipoEvaluacion {
    id: Int!
    tipo: String!
    descripcion: String!
  }

  type PreguntaEvaluacion {
    id: Int!
    idEvaluacion: Int!
    pregunta: String!
  }

  type EscalaLikert {
    id: Int!
    respuesta: String!
    puntaje: Int!
  }

  type ResultadoEvaluacion {
    id: ID!
    idSesion: String!
    tipoEvaluacionId: Int!
    preguntaId: Int!
    respuestaId: Int!
    puntaje: Int!
    idServidorPublico: Int!
    idEvaluador: Int
    idInstitucion: Int!
  }

 input GuardarEvaluacionInput {
    idSesion: String!
    tipoEvaluacionId: Int!
    preguntaId: Int!
    respuestaId: Int!
    puntaje: Int!
    idServidorPublico: Int!
}

  input ActualizarEvaluacionInput {
    respuestaId: Int!
    puntaje: Int!
  }


type SeguimientoEvaluacion {
    id: ID!
    idSesion: String!
    idServidorPublico: Int!
    tipoEvaluacionId: Int!
    idEvaluador: Int
    estado: String!
    preguntasOrdenadas: [Int!]!
    opcionesOrdenadas: [OpcionPreguntaOrdenada!]!
    tiempoEvaluacion: Int
    fechaInicio: String!
    fechaFinalizacion: String
    fechaUltimaReanudacion: String
}

  type OpcionPreguntaOrdenada {
    preguntaId: Int!
    respuestaIds: [Int!]!
  }

  type TemporizadorEvaluacion {
    tiempoTotal: Int!
    tiempoTranscurrido: Int!
    tiempoRestante: Int!
    estado: String!
    fechaInicio: String!
    fechaFinalizacion: String
    fechaUltimaReanudacion: String
}

  enum EstadoEvaluacionSubalterno {
    EVALUADO
    PENDIENTE
  }

  type ServidorPublicoPorToken {
    idServidorPublico: Int!
    idInstitucion: Int!
    institucion: String!
    dni: String!
    nombre: String!
    cargo: String!
    area: String
    correo: String
    idEnlace: Int!
    idEvaluador: Int
    linked: String
  }

  type SubalternoEvaluacion {
    idServidorPublico: Int!
    idInstitucion: Int!
    institucion: String!
    dni: String!
    nombre: String!
    cargo: String!
    area: String
    correo: String
    idEnlace: Int!
    idEvaluador: Int
    estadoEvaluacion: EstadoEvaluacionSubalterno!
}

type EvaluationAvailability {
    autoevaluacionRealizada: Boolean!
    subalternosEvaluados: Int!
    totalSubalternos: Int!
    evaluacionInstitucionalRealizada: Boolean!
}

  input CrearSeguimientoInput {
    idSesion: String!
    idServidorPublico: Int!
    tipoEvaluacionId: Int!
  }

  input OpcionPreguntaOrdenadaInput {
    preguntaId: Int!
    respuestaIds: [Int!]!
  }

  input ActualizarOrdenSeguimientoInput {
    idSesion: String!
    idServidorPublico: Int!
    tipoEvaluacionId: Int!
    preguntasOrdenadas: [Int!]!
    opcionesOrdenadas: [OpcionPreguntaOrdenadaInput!]!
  }

  extend type Query {

    evaluationAvailability: EvaluationAvailability!

    servidorPublicoPorToken(
        token: String!
    ): ServidorPublicoPorToken

    subalternosEvaluacion: [SubalternoEvaluacion!]!

    tiposEvaluacion: [TipoEvaluacion!]!

    preguntasEvaluacion(
        idEvaluacion: Int!
    ): [PreguntaEvaluacion!]!

    escalaLikert: [EscalaLikert!]!

    respuestasEvaluacion(
        idSesion: String!
        tipoEvaluacionId: Int!
        idServidorPublico: Int!
    ): [ResultadoEvaluacion!]!

    seguimientoEvaluacion(
        idSesion: String!
        tipoEvaluacionId: Int!
        idServidorPublico: Int!
    ): SeguimientoEvaluacion

    temporizadorEvaluacion(
        idSesion: String!
        tipoEvaluacionId: Int!
        idServidorPublico: Int!
    ): TemporizadorEvaluacion!
  }

  extend type Mutation {
    saveEvaluacion(
        input: GuardarEvaluacionInput!
    ): ResultadoEvaluacion!

    updateEvaluacion(
        id: ID!
        input: ActualizarEvaluacionInput!
    ): ResultadoEvaluacion!

    crearSeguimiento(
      input: CrearSeguimientoInput!
    ): SeguimientoEvaluacion!

    actualizarOrdenSeguimiento(
      input: ActualizarOrdenSeguimientoInput!
    ): SeguimientoEvaluacion!

    marcarSeguimientoEnProceso(
      idSesion: String!
      tipoEvaluacionId: Int!
      idServidorPublico: Int!
    ): SeguimientoEvaluacion!

    finalizarSeguimiento(
      idSesion: String!
      tipoEvaluacionId: Int!
      idServidorPublico: Int!
    ): SeguimientoEvaluacion!

    pausarSeguimiento(
        idSesion: String!
        tipoEvaluacionId: Int!
        idServidorPublico: Int!
    ): SeguimientoEvaluacion!

    reanudarSeguimiento(
        idSesion: String!
        tipoEvaluacionId: Int!
        idServidorPublico: Int!
    ): SeguimientoEvaluacion!
}
    
`;
