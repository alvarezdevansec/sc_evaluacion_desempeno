
export type EvaluationTypeId = 1 | 2 | 3;

export interface EvaluationType {
  id: EvaluationTypeId;
  tipo: string;
  descripcion: string;
}

export interface PublicServant {
  idServidorPublico: number;
  nombre: string;
  cargo: string;
  area?: string;
  estadoEvaluacion?: 'EVALUADO' | 'PENDIENTE';
}

export interface ServidorPublicoPorToken {
  idServidorPublico: number;
  idInstitucion: number;
  institucion: string;
  nombre: string;
  cargo: string;
  area: string | null;
  idEnlace: number;
  idEvaluador: number | null;
}

// export interface EmployeeProfile {
//   institucion: string;
//   nombre: string;
// }

export interface ServidorProfile {
  idServidorPublico: number;
  idInstitucion: number;
  idEnlace: number;
  idEvaluador: number;
  institucion: string;
  nombre: string;
}

export interface LikertOption {
  id: number;
  respuesta: string;
  puntaje: number;
}

export interface EvaluationQuestion {
  id: number;
  idEvaluacion: EvaluationTypeId;
  pregunta: string;
}

export interface QuestionView {
  id: number;
  text: string;
  answers: LikertOption[];
}

export type EvaluationAnswers = Record<number, number>;

export interface EvaluationInput {
  tipoEvaluacionId: EvaluationTypeId;
  servidorEvaluadoId?: number;
  respuestas: Array<{
    preguntaId: number;
    valor: number;
  }>;
}

export interface EvaluationRecord {
  id: string;
  tipoEvaluacionId: EvaluationTypeId;
  servidorEvaluadoId?: number;
  respuestas: Array<{
    preguntaId: number;
    valor: number;
  }>;
  createdAt: string;
}
