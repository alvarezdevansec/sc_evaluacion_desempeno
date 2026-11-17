import type { EvaluationAnswers, EvaluationInput, EvaluationTypeId, QuestionView } from '@/types';

export interface EvaluationValidationResult {
  valid: boolean;
  message?: string;
}

export function validateEvaluation(
  evaluationType: EvaluationTypeId | null,
  questions: QuestionView[],
  answers: EvaluationAnswers,
): EvaluationValidationResult {
  if (evaluationType === null) return { valid: false, message: 'Seleccione un tipo de evaluación.' };
  if (questions.length === 0) return { valid: false, message: 'No hay preguntas disponibles para esta evaluación.' };

  const questionIds = new Set(questions.map((question) => question.id));
  for (const [rawId, value] of Object.entries(answers)) {
    const id = Number(rawId);
    if (!questionIds.has(id)) {
      return { valid: false, message: 'Se detectaron respuestas que no corresponden a esta evaluación.' };
    }
    const question = questions.find((item) => item.id === id);
    if (!Number.isInteger(value) || !question?.answers.some((option) => option.puntaje === value)) {
      return { valid: false, message: 'Se encontró una respuesta no válida. Revise sus selecciones.' };
    }
  }

  const unanswered = questions.filter((question) => answers[question.id] === undefined);
  if (unanswered.length) {
    return { valid: false, message: `Debe responder todas las preguntas. Faltan ${unanswered.length} por responder.` };
  }
  return { valid: true };
}

export function buildEvaluationInput(
  evaluationType: EvaluationTypeId,
  questions: QuestionView[],
  answers: EvaluationAnswers,
  selectedServantId?: number,
): EvaluationInput {
  return {
    tipoEvaluacionId: evaluationType,
    servidorEvaluadoId: selectedServantId,
    respuestas: questions.map((question) => ({ preguntaId: question.id, valor: answers[question.id] })),
  };
}
