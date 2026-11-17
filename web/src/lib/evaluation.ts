
import type {
  EvaluationTypeId,
  EvaluationQuestion,
  LikertOption,
  QuestionView,
} from '@/types';

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export function createRandomQuestions(
  typeId: EvaluationTypeId,
  preguntas: EvaluationQuestion[],
  escalaLikert: LikertOption[],
): QuestionView[] {
  const preguntasFiltradas = preguntas.filter(
    (question) => question.idEvaluacion === typeId,
  );

  if (!preguntasFiltradas.length) {
    throw new Error(
      'No hay preguntas disponibles para este tipo de evaluación.',
    );
  }

  if (!escalaLikert.length) {
    throw new Error(
      'No hay opciones disponibles en la escala Likert.',
    );
  }

  return shuffle(
    preguntasFiltradas.map((question) => ({
      id: question.id,
      text: question.pregunta,
      answers: shuffle([...escalaLikert]),
    })),
  );
}



export function restoreSavedQuestions(
  preguntas: EvaluationQuestion[],
  escalaLikert: LikertOption[],
  preguntaIds: number[],
  opcionesPorPregunta: {
    preguntaId: number;
    respuestaIds: number[];
  }[],
): QuestionView[] {
  if (!preguntaIds.length) {
    throw new Error(
      'No existen preguntas guardadas para recuperar.',
    );
  }

  if (!escalaLikert.length) {
    throw new Error(
      'No se encontraron opciones en la escala Likert.',
    );
  }

  // Evitar preguntas duplicadas.
  if (new Set(preguntaIds).size !== preguntaIds.length) {
    throw new Error(
      'El orden guardado contiene preguntas duplicadas.',
    );
  }

  const preguntasMap = new Map(
    preguntas.map((question) => [question.id, question]),
  );

  const opcionesMap = new Map(
    escalaLikert.map((option) => [option.id, option]),
  );

  const opcionesPorPreguntaMap = new Map(
    opcionesPorPregunta.map((item) => [
      item.preguntaId,
      item.respuestaIds,
    ]),
  );

  // Validar que no existan configuraciones duplicadas.
  if (opcionesPorPreguntaMap.size !== opcionesPorPregunta.length) {
    throw new Error(
      'Existen configuraciones de opciones duplicadas.',
    );
  }

  return preguntaIds.map((preguntaId) => {
    const pregunta = preguntasMap.get(preguntaId);

    if (!pregunta) {
      throw new Error(
        `No se encontró la pregunta guardada con ID ${preguntaId}.`,
      );
    }

    const respuestaIds =
      opcionesPorPreguntaMap.get(preguntaId);

    if (!respuestaIds) {
      throw new Error(
        `No se encontró el orden de opciones de la pregunta ${preguntaId}.`,
      );
    }

    // Verificar que cada opción aparezca una sola vez.
    if (new Set(respuestaIds).size !== respuestaIds.length) {
      throw new Error(
        `La pregunta ${preguntaId} contiene opciones duplicadas.`,
      );
    }

    // Verificar que estén todas las opciones Likert.
    if (
      respuestaIds.length !== escalaLikert.length ||
      respuestaIds.some((id) => !opcionesMap.has(id)) ||
      escalaLikert.some(
        (option) => !respuestaIds.includes(option.id),
      )
    ) {
      throw new Error(
        `El orden de opciones de la pregunta ${preguntaId} está incompleto o es inválido.`,
      );
    }

    const answers = respuestaIds.map((respuestaId) => {
      const opcion = opcionesMap.get(respuestaId);

      if (!opcion) {
        throw new Error(
          `No se encontró la opción Likert con ID ${respuestaId}.`,
        );
      }

      return opcion;
    });

    return {
      id: pregunta.id,
      text: pregunta.pregunta,
      answers,
    };
  });
}
