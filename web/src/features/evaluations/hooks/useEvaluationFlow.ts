
'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { getOrCreateEvaluationSessionId } from '@/lib/evaluationSession';
import { createRandomQuestions, restoreSavedQuestions } from '@/lib/evaluation';
import { canAccessEvaluation } from '@/lib/evaluationPermissions';
// import { servidorPublico } from '@/data';


import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  getEvaluationTypes,
  getEvaluationQuestions,
  getLikertOptions,
  getEvaluationAnswers,
  getEvaluationAvailability,
  saveEvaluationAnswer,
  updateEvaluationAnswer,
  crearSeguimiento,
  actualizarOrdenSeguimiento,
  obtenerTemporizador,
  pausarSeguimiento,
  reanudarSeguimiento,
  finalizarSeguimiento,
} from '@/services/evaluations';
import { validateEvaluation } from '@/lib/evaluationValidation';
import type {
  EvaluationAnswers,
  EvaluationQuestion,
  EvaluationType,
  EvaluationTypeId,
  LikertOption,
  PublicServant,
  ServidorPublicoPorToken,
  QuestionView,
} from '@/types';


type EvaluationTrackingStatus =
  | 'INICIADA'
  | 'EN PROCESO'
  | 'PAUSADA'
  | 'FINALIZADA';


interface UseEvaluationFlowProps {
  servidorPublico: ServidorPublicoPorToken;
  token: string;
}

interface EvaluationAvailability {
  autoevaluacionRealizada: boolean;
  subalternosEvaluados: number;
  totalSubalternos: number;
  evaluacionInstitucionalRealizada: boolean;
}

export function useEvaluationFlow({
  servidorPublico,
  token,
}: UseEvaluationFlowProps) {


  const { notify, confirm } = useNotifications();

  const [evaluationAvailability, setEvaluationAvailability] =
    useState<EvaluationAvailability>({
      autoevaluacionRealizada: false,
      subalternosEvaluados: 0,
      totalSubalternos: 0,
      evaluacionInstitucionalRealizada: false,
    });

  const [remainingSeconds, setRemainingSeconds] = useState<number>(1200);
  const [isEvaluationExpired, setIsEvaluationExpired] = useState(false);

  const [timerRunning, setTimerRunning] = useState(false);
  const [trackingStatus, setTrackingStatus] =
    useState<EvaluationTrackingStatus | null>(null);

  const timerFinalizationRef = useRef(false);
  const pendingTrackingStartRef = useRef(false);
  const startingTrackingRef = useRef(false);

  const activeTrackingRef = useRef<{
    idSesion: string;
    tipoEvaluacionId: EvaluationTypeId;
    idServidorPublico: number;
    idEvaluador: number | null;
  } | null>(null);

  const [validationAttempt, setValidationAttempt] = useState(0);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const [idSesion, setIdSesion] = useState<string | null>(null);

  const [evaluationTypes, setEvaluationTypes] = useState<EvaluationType[]>([]);
  const [preguntasEvaluacion, setPreguntasEvaluacion] = useState<EvaluationQuestion[]>([]);
  const [escalaLikert, setEscalaLikert] = useState<LikertOption[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [evaluationType, setEvaluationType] = useState<EvaluationTypeId | null>(null);
  const [selectedSubalterno, setSelectedSubalterno] = useState<PublicServant | null>(null);

  const [questions, setQuestions] = useState<QuestionView[]>([]);
  const [answers, setAnswers] = useState<EvaluationAnswers>({});

  const answerRecordIdsRef = useRef<Record<number, string>>({});
  const answerOperationsRef = useRef(new Map<number, Promise<void>>());


  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      setIsLoadingData(true);
      setError(null);

      try {
        const [types, likert, availability] = await Promise.all([
          getEvaluationTypes(),
          getLikertOptions(),
          getEvaluationAvailability(token),
        ]);

        if (!active) return;

        setEvaluationTypes(types);
        setEscalaLikert(likert);
        setEvaluationAvailability(availability);
      } catch (err) {
        if (!active) return;

        const message = err instanceof Error
          ? err.message
          : 'No fue posible cargar la información de las evaluaciones.';

        setError(message);
        notify.error(message);
      } finally {
        if (active) {
          setIsLoadingData(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      active = false;
    };
  }, [notify]);

  const selectedEvaluation = useMemo(
    () => evaluationTypes.find((item) => item.id === evaluationType),
    [evaluationTypes, evaluationType],
  );

  const answeredCount = Object.keys(answers).length;

  const unansweredQuestionIds = useMemo(
    () =>
      questions
        .filter((question) => answers[question.id] === undefined)
        .map((question) => question.id),
    [questions, answers],
  );

  const progress = useMemo(
    () =>
      questions.length
        ? Math.round((answeredCount / questions.length) * 100)
        : 0,
    [answeredCount, questions.length],
  );

  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      setCountdown(null);
      return;
    }

    const timer = window.setTimeout(
      () => setCountdown((value) => (value === null ? null : value - 1)),
      1000,
    );

    return () => window.clearTimeout(timer);
  }, [countdown]);

  // La evaluación solo comienza después de completar el countdown.
  useEffect(() => {
    if (countdown !== null || !pendingTrackingStartRef.current || startingTrackingRef.current) {
      return;
    }

    const tracking = activeTrackingRef.current;
    if (!tracking) {
      pendingTrackingStartRef.current = false;
      return;
    }

    pendingTrackingStartRef.current = false;
    startingTrackingRef.current = true;

    void (async () => {
      try {
        const temporizadorPrevio = await obtenerTemporizador(tracking, token);
        const segundosPrevios = Math.max(0, Math.floor(Number(temporizadorPrevio.tiempoRestante)));

        if (temporizadorPrevio.estado === 'FINALIZADA' || segundosPrevios <= 0) {
          setTrackingStatus('FINALIZADA');
          setRemainingSeconds(0);
          setIsEvaluationExpired(true);
          timerFinalizationRef.current = true;
          notify.warning('El tiempo de evaluación ha finalizado.');
          return;
        }

        // INICIADA aún no consume tiempo: el countdown es solo visual.
        // El cronómetro se activará desde el backend al persistir la primera respuesta.
        if (temporizadorPrevio.estado === 'INICIADA') {
          setTrackingStatus('INICIADA');
          setRemainingSeconds(segundosPrevios);
          setIsEvaluationExpired(false);
          timerFinalizationRef.current = false;
          setTimerRunning(false);
          return;
        }

        const seguimiento = temporizadorPrevio.estado === 'EN PROCESO'
          ? null
          : await reanudarSeguimiento(tracking, token);

        if (seguimiento) setTrackingStatus(seguimiento.estado);

        const temporizadorActivo = await obtenerTemporizador(tracking, token);
        const segundosRestantes = Math.max(0, Math.floor(Number(temporizadorActivo.tiempoRestante)));
        const finalizada = temporizadorActivo.estado === 'FINALIZADA' || segundosRestantes <= 0;

        setTrackingStatus(finalizada ? 'FINALIZADA' : temporizadorActivo.estado);
        setRemainingSeconds(segundosRestantes);
        setIsEvaluationExpired(finalizada);
        timerFinalizationRef.current = finalizada;
        setTimerRunning(!finalizada && temporizadorActivo.estado === 'EN PROCESO');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No fue posible iniciar el temporizador.';
        setTimerRunning(false);
        setError(message);
        notify.error(message);
      } finally {
        startingTrackingRef.current = false;
      }
    })();
  }, [countdown, token, notify]);

  useEffect(() => {
    if (remainingSeconds > 0 || !timerRunning || timerFinalizationRef.current) return;

    const tracking = activeTrackingRef.current;
    if (!tracking) {
      setTimerRunning(false);
      return;
    }

    timerFinalizationRef.current = true;
    setTimerRunning(false);

    // PostgreSQL es la autoridad del vencimiento. No se finaliza manualmente
    // desde el navegador porque el intervalo local puede retrasarse.
    void obtenerTemporizador(tracking, token)
      .then((temporizador) => {
        const segundosRestantes = Math.max(
          0,
          Math.floor(Number(temporizador.tiempoRestante)),
        );

        setRemainingSeconds(segundosRestantes);
        setTrackingStatus(temporizador.estado);

        if (temporizador.estado === 'FINALIZADA' || segundosRestantes <= 0) {
          setIsEvaluationExpired(true);
          notify.warning(
            'El tiempo de evaluación ha finalizado. La evaluación ha sido cerrada.',
          );
          return;
        }

        // El servidor todavía registra tiempo disponible: corregir el contador
        // local y continuar sin reiniciar el segmento activo.
        setIsEvaluationExpired(false);
        timerFinalizationRef.current = false;
        setTimerRunning(temporizador.estado === 'EN PROCESO');
      })
      .catch((err) => {
        console.error('[TIMER] Error al verificar el vencimiento:', err);
        timerFinalizationRef.current = false;
        setRemainingSeconds(1);
        notify.error('No fue posible verificar el tiempo de evaluación. Se volverá a consultar.');
        setTimerRunning(true);
      });
  }, [remainingSeconds, timerRunning, notify, token]);

  // ==========================================
  // TEMPORIZADOR DE EVALUACIÓN: 20 MINUTOS
  // ==========================================

  useEffect(() => {
    if (!timerRunning || isEvaluationExpired) return;

    const interval = window.setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning, isEvaluationExpired]);

  const startQuestions = async (
    type: EvaluationTypeId,
    sessionId: string,
    servidorEvaluadoId?: number,
  ) => {

    if (!sessionId) {
      notify.error('No se encontró la sesión de evaluación.');
      return;
    }

    setTimerRunning(false);
    setIsLoadingQuestions(true);
    setError(null);
    setQuestions([]);
    setAnswers({});
    answerRecordIdsRef.current = {};
    answerOperationsRef.current.clear();
    setSubmitted(false);
    setCountdown(null);
    setShowValidationErrors(false);

    pendingTrackingStartRef.current = false;
    startingTrackingRef.current = false;

    try {
      const preguntas = await getEvaluationQuestions(type);

      if (!preguntas.length) {
        throw new Error('No hay preguntas disponibles para este tipo de evaluación.');
      }

      if (!escalaLikert.length) {
        throw new Error('No se encontraron opciones en la escala Likert.');
      }

      if (type === 2 && servidorEvaluadoId === undefined) {
        throw new Error('No se ha seleccionado un subalterno.');
      }

      const idServidorPublico = type === 2
        ? servidorEvaluadoId!
        : servidorPublico.idServidorPublico;
      const idEvaluador = type === 2 ? servidorPublico.idServidorPublico : null;

      setPreguntasEvaluacion(preguntas);

      const trackingInput = {
        idSesion: sessionId,
        tipoEvaluacionId: type,
        idServidorPublico,
        idEvaluador,
      };

      const seguimiento = await crearSeguimiento(trackingInput, token);
      activeTrackingRef.current = trackingInput;
      setTrackingStatus(seguimiento.estado);

      let randomQuestions: QuestionView[];
      const preguntasGuardadas = seguimiento.preguntasOrdenadas ?? [];
      const opcionesGuardadas = seguimiento.opcionesOrdenadas ?? [];

      if (preguntasGuardadas.length > 0 && opcionesGuardadas.length > 0) {
        randomQuestions = restoreSavedQuestions(
          preguntas,
          escalaLikert,
          preguntasGuardadas,
          opcionesGuardadas,
        );
      } else {
        randomQuestions = createRandomQuestions(type, preguntas, escalaLikert);

        await actualizarOrdenSeguimiento({
          ...trackingInput,
          preguntasOrdenadas: randomQuestions.map((question) => question.id),
          opcionesOrdenadas: randomQuestions.map((question) => ({
            preguntaId: question.id,
            respuestaIds: question.answers.map((answer) => answer.id),
          })),
        }, token);
      }

      const savedAnswers = await getEvaluationAnswers(
        { ...trackingInput },
        token,
      );

      answerRecordIdsRef.current = {};
      const restoredAnswers: EvaluationAnswers = {};

      savedAnswers.forEach((item) => {
        const questionExists = randomQuestions.some((question) => question.id === item.preguntaId);
        const optionExists = escalaLikert.some(
          (option) => option.id === item.respuestaId && option.puntaje === item.puntaje,
        );

        if (questionExists && optionExists) {
          restoredAnswers[item.preguntaId] = item.puntaje;
          if (item.id) answerRecordIdsRef.current[item.preguntaId] = item.id;
        }
      });

      // Si había una sesión activa (por ejemplo, otra pestaña o una salida
      // inesperada), detenerla antes del countdown para que este no consuma tiempo.
      let temporizador = await obtenerTemporizador(trackingInput, token);
      if (temporizador.estado === 'EN PROCESO') {
        const pausado = await pausarSeguimiento(trackingInput, token);
        setTrackingStatus(pausado.estado);
        temporizador = await obtenerTemporizador(trackingInput, token);
      }

      const segundosRestantes = Math.max(0, Math.floor(Number(temporizador.tiempoRestante)));
      const finalizada = temporizador.estado === 'FINALIZADA' || segundosRestantes <= 0;

      setQuestions(randomQuestions);
      setAnswers(restoredAnswers);
      setRemainingSeconds(segundosRestantes);
      setIsEvaluationExpired(finalizada);
      timerFinalizationRef.current = finalizada;
      setTrackingStatus(finalizada ? 'FINALIZADA' : temporizador.estado);

      if (!finalizada) {
        pendingTrackingStartRef.current = true;
        setCountdown(3);
      } else {
        setCountdown(null);
        notify.warning('Esta evaluación ya fue finalizada o su tiempo ha vencido.');
      }

    } catch (err) {
      pendingTrackingStartRef.current = false;
      startingTrackingRef.current = false;

      if (activeTrackingRef.current) {
        try {
          const seguimientoActual = await obtenerTemporizador(activeTrackingRef.current, token);
          if (seguimientoActual.estado === 'EN PROCESO') {
            const seguimientoPausado = await pausarSeguimiento(activeTrackingRef.current, token);
            setTrackingStatus(seguimientoPausado.estado);
          }
        } catch (pauseError) {
          console.error('[TRACKING] No fue posible pausar tras un error:', pauseError);
        }
      }

      setTimerRunning(false);
      setCountdown(null);

      const message = err instanceof Error
        ? err.message
        : 'No fue posible cargar las preguntas de la evaluación.';

      setError(message);
      notify.error(message);

    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // ==========================================
  // SELECCIONAR TIPO DE EVALUACIÓN
  // ==========================================

  const chooseType = (id: EvaluationTypeId) => {

    if (!canAccessEvaluation(servidorPublico.idEnlace, id)) {
      notify.warning(
        'No tiene permisos para acceder a este tipo de evaluación.',
      );
      return;
    }

    // console.log('[EVALUATION] chooseType ejecutado:', id);

    const sharedSessionId = getOrCreateEvaluationSessionId(
      servidorPublico.idServidorPublico,
      servidorPublico.idInstitucion,
    );

    const sessionId = sharedSessionId;

    // Crear una entrada interna para interceptar el botón Atrás mientras
    // existe una evaluación activa y poder pausarla antes de cambiar de vista.
    window.history.pushState({ evaluationFlow: true }, '', window.location.href);

    setTimerRunning(false);
    setRemainingSeconds(1200);
    setIsEvaluationExpired(false);

    timerFinalizationRef.current = false;
    activeTrackingRef.current = null;
    setTrackingStatus(null);

    setEvaluationType(id);
    setIdSesion(sessionId);

    setSelectedSubalterno(null);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setShowValidationErrors(false);
    setError(null);
    setCountdown(null);

    if (id !== 2) {
      void startQuestions(id, sessionId);
    }
  };

  // ==========================================
  // SELECCIONAR SUBALTERNO
  // ==========================================

  const chooseSubalterno = (person: PublicServant) => {
    if (!idSesion) {
      notify.error('No se encontró la sesión de evaluación.');
      return;
    }

    setTimerRunning(false);
    setCountdown(null);

    setRemainingSeconds(1200);
    setIsEvaluationExpired(false);

    timerFinalizationRef.current = false;
    activeTrackingRef.current = null;
    setTrackingStatus(null);

    setSelectedSubalterno(person);

    void startQuestions(
      2,
      idSesion,
      person.idServidorPublico,
    );
  };

  // ==========================================
  // REGRESAR A LA LISTA DE SUBALTERNOS
  // ==========================================

  const goBack = async (): Promise<boolean> => {
    // Esperar a que terminen las operaciones de guardado pendientes.
    const pendingOperations = Array.from(
      answerOperationsRef.current.values(),
    );

    const results = await Promise.allSettled(pendingOperations);

    const failedOperation = results.find(
      (result) => result.status === 'rejected',
    );

    if (failedOperation) {
      notify.error(
        'No se pudo guardar una o más respuestas. Intente nuevamente antes de regresar.',
      );
      return false;
    }

    const tracking = activeTrackingRef.current;

    if (tracking && !submitted) {
      try {
        // Consultar PostgreSQL; no depender del estado local de React.
        const temporizador = await obtenerTemporizador(tracking, token);

        if (temporizador.estado === 'FINALIZADA') {
          setTrackingStatus('FINALIZADA');
          setRemainingSeconds(0);
          setIsEvaluationExpired(true);
          setTimerRunning(false);
        } else if (temporizador.estado === 'EN PROCESO') {
          const seguimientoPausado = await pausarSeguimiento(
            tracking,
            token,
          );

          setTrackingStatus(seguimientoPausado.estado);
          setTimerRunning(false);
        } else {
          setTrackingStatus(temporizador.estado);
          setTimerRunning(false);
        }
      } catch (err) {
        const message = err instanceof Error
          ? err.message
          : 'No fue posible pausar el seguimiento de la evaluación.';

        notify.error(message);
        return false;
      }
    }

    setTimerRunning(false);
    pendingTrackingStartRef.current = false;
    startingTrackingRef.current = false;
    activeTrackingRef.current = null;

    setSelectedSubalterno(null);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setCountdown(null);
    setError(null);
    setShowValidationErrors(false);

    answerRecordIdsRef.current = {};
    answerOperationsRef.current.clear();

    return true;
  };

  // ==========================================
  // REINICIAR FLUJO
  // ==========================================


  const restart = async (returnToSubalternos = false) => {
    if (submitted && evaluationType === 2) {
      const confirmado = await confirm({
        title: returnToSubalternos
          ? '¿Desea volver a la lista de subalternos?'
          : '¿Desea iniciar una nueva evaluación?',
        message: returnToSubalternos
          ? 'La evaluación actual ya fue finalizada. Si continúa, regresará a la selección de subalternos.'
          : 'La evaluación actual ya fue finalizada. Si continúa, regresará a la selección de evaluaciones.',
        confirmText: 'Sí, continuar',
        cancelText: 'Cancelar',
      });

      if (!confirmado) return;
    }

    // Si existe un seguimiento activo, primero esperamos los guardados
    // pendientes y pausamos en PostgreSQL antes de abandonar la evaluación.
    // Esto aplica a los tres tipos de evaluación, no solo a subalternos.
    if (activeTrackingRef.current !== null) {
      const pudoRegresar = await goBack();

      if (!pudoRegresar) return;
    } else {
      // Desde la selección de tipo o la lista de subalternos no hay
      // un seguimiento individual activo que necesite pausarse.
      setTimerRunning(false);
      setCountdown(null);
    }

    // Si se solicita regresar a la lista, conservar el tipo 2.
    if (!returnToSubalternos) {
      setEvaluationType(null);
      setIdSesion(null);
    }
  };


  // ==========================================
  // NAVEGACIÓN ATRÁS DEL NAVEGADOR
  // ==========================================

  useEffect(() => {
    const handlePopState = () => {
      // Si ya estamos en la selección inicial, permitir la navegación normal.
      if (evaluationType === null) return;

      // Restaurar la entrada para evitar abandonar la evaluación antes de
      // completar la pausa en PostgreSQL.
      window.history.pushState({ evaluationFlow: true }, '', window.location.href);

      if (evaluationType === 2 && selectedSubalterno !== null) {
        void goBack();
      } else {
        void restart();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [evaluationType, selectedSubalterno, goBack, restart]);

  // ==========================================
  // REGISTRAR RESPUESTAS
  // ==========================================

  const updateAnswer = (questionId: number, value: number) => {
    if (submitted || isSubmitting) return;

    if (isEvaluationExpired || remainingSeconds <= 0) {
      notify.warning('El tiempo de evaluación ha finalizado.');
      return;
    }

    if (
      trackingStatus !== 'INICIADA' &&
      trackingStatus !== 'EN PROCESO'
    ) {
      notify.warning(
        'La evaluación no se encuentra activa. No es posible registrar respuestas.',
      );
      return;
    }

    if (!evaluationType || !idSesion) {
      notify.error('No se pudo identificar la evaluación activa.');
      return;
    }

    const pregunta = questions.find(
      (item) => item.id === questionId,
    );

    const opcion = escalaLikert.find(
      (item) => item.puntaje === value,
    );

    if (!pregunta || !opcion) {
      notify.error('No se encontró la pregunta o la opción seleccionada.');
      return;
    }

    const idServidorPublico = evaluationType === 2
      ? selectedSubalterno?.idServidorPublico
      : servidorPublico.idServidorPublico;

    if (!idServidorPublico) {
      notify.error('No se pudo identificar al servidor público evaluado.');
      return;
    }

    const idEvaluador = evaluationType === 2
      ? servidorPublico.idServidorPublico
      : null;

    const input = {
      idSesion,
      tipoEvaluacionId: evaluationType,
      preguntaId: pregunta.id,
      respuestaId: opcion.id,
      puntaje: opcion.puntaje,
      idServidorPublico,
      idEvaluador,
      idInstitucion: servidorPublico.idInstitucion,
    };

    const respuestaAnterior = answers[questionId];

    const previousOperation =
      answerOperationsRef.current.get(questionId) ??
      Promise.resolve();

    const operation = previousOperation
      .catch(() => undefined)
      .then(async () => {
        const existingId = answerRecordIdsRef.current[questionId];

        if (existingId) {

          const result = await updateEvaluationAnswer(
            existingId,
            {
              respuestaId: input.respuestaId,
              puntaje: input.puntaje,
            },
            token,
          );

          if (!result?.id) {
            throw new Error(
              'El servidor no confirmó la actualización de la respuesta.',
            );
          }
        } else {
          const result = await saveEvaluationAnswer(input, token);

          if (!result?.id) {
            throw new Error(
              'El servidor no devolvió el identificador de la respuesta guardada.',
            );
          }

          answerRecordIdsRef.current[questionId] = result.id;

          const tracking = activeTrackingRef.current;

          if (!tracking) {
            throw new Error(
              'No se encontró el seguimiento activo de la evaluación.',
            );
          }

          // Consultar el estado real después de guardar la primera respuesta.
          const temporizador = await obtenerTemporizador(tracking, token);

          const segundosRestantes = Math.max(
            0,
            Math.floor(Number(temporizador.tiempoRestante)),
          );

          const finalizada =
            temporizador.estado === 'FINALIZADA' ||
            segundosRestantes <= 0;

          setTrackingStatus(
            finalizada ? 'FINALIZADA' : temporizador.estado,
          );

          setRemainingSeconds(segundosRestantes);
          setIsEvaluationExpired(finalizada);
          timerFinalizationRef.current = finalizada;

          setTimerRunning(
            !finalizada && temporizador.estado === 'EN PROCESO',
          );

          if (finalizada) {
            notify.warning('El tiempo de evaluación ha finalizado.');
            return;
          }
        }

        // La respuesta se refleja en la interfaz después de confirmarse.
        setAnswers((previous) => ({
          ...previous,
          [questionId]: value,
        }));
      });

    answerOperationsRef.current.set(questionId, operation);

    void operation
      .catch((err) => {
        const message = err instanceof Error
          ? err.message
          : 'No fue posible guardar la respuesta.';

        // Restaurar la selección anterior si la operación falló.
        setAnswers((previous) => {
          if (respuestaAnterior === undefined) {
            const updated = { ...previous };
            delete updated[questionId];
            return updated;
          }

          return {
            ...previous,
            [questionId]: respuestaAnterior,
          };
        });

        notify.error(message);
        console.error('[RegistroRespuesta]', err);
      })
      .finally(() => {
        if (answerOperationsRef.current.get(questionId) === operation) {
          answerOperationsRef.current.delete(questionId);
        }
      });
  };

  // ==========================================
  // FINALIZAR EVALUACIÓN
  // ==========================================

  const submit = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    if (isEvaluationExpired || remainingSeconds <= 0) {
      notify.warning('El tiempo de evaluación ha finalizado.');
      return;
    }

    if (isSubmitting || isLoadingQuestions) return;

    const validation = validateEvaluation(
      evaluationType,
      questions,
      answers,
    );

    const tracking = activeTrackingRef.current;

    if (!tracking) {
      throw new Error('No existe un seguimiento activo.');
    }

    const temporizador = await obtenerTemporizador(tracking, token);

    if (
      temporizador.estado !== 'EN PROCESO' ||
      Number(temporizador.tiempoRestante) <= 0
    ) {
      const finalizada =
        temporizador.estado === 'FINALIZADA' ||
        Number(temporizador.tiempoRestante) <= 0;

      setTrackingStatus(
        finalizada ? 'FINALIZADA' : temporizador.estado,
      );

      setRemainingSeconds(
        Math.max(0, Math.floor(Number(temporizador.tiempoRestante))),
      );

      setTimerRunning(false);

      if (finalizada) {
        setIsEvaluationExpired(true);
      }

      throw new Error(
        'La evaluación no está activa o su tiempo ha finalizado.',
      );
    }



    if (!validation.valid) {
      setShowValidationErrors(true);
      setValidationAttempt((previous) => previous + 1);

      notify.warning(
        validation.message ?? 'Debe responder todas las preguntas pendientes.',
      );

      return;
    }

    setShowValidationErrors(false);

    if (evaluationType === null) return;

    setIsSubmitting(true);

    try {

      // Esperar a que terminen todos los INSERT y UPDATE pendientes.
      await Promise.all(
        Array.from(answerOperationsRef.current.values()),
      );

      if (timerFinalizationRef.current || isEvaluationExpired || remainingSeconds <= 0) {
        throw new Error('El tiempo de evaluación ha finalizado.');
      }

      const tracking = activeTrackingRef.current;
      if (!tracking) {
        throw new Error('No se encontró el seguimiento de la evaluación.');
      }

      // Confirmar el tiempo con PostgreSQL antes de finalizar manualmente.
      const temporizador = await obtenerTemporizador(tracking, token);
      if (temporizador.estado === 'FINALIZADA' || Number(temporizador.tiempoRestante) <= 0) {
        setTrackingStatus('FINALIZADA');
        setRemainingSeconds(0);
        setIsEvaluationExpired(true);
        timerFinalizationRef.current = true;
        throw new Error('El tiempo de evaluación ha finalizado.');
      }

      const seguimientoFinalizado = await finalizarSeguimiento(tracking, token);
      setTrackingStatus(seguimientoFinalizado.estado);
      timerFinalizationRef.current = true;
      setTimerRunning(false);

      setTimerRunning(false);
      setSubmitted(true);
      notify.success('La evaluación se completó correctamente.');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'No fue posible registrar la evaluación.';
      notify.error(message);

    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    evaluationTypes,
    evaluationType,
    selectedSubalterno,
    questions,
    answers,
    submitted,
    isSubmitting,
    isLoadingData,
    isLoadingQuestions,
    error,
    evaluationAvailability,
    countdown,
    selectedEvaluation,
    answeredCount,
    progress,
    chooseType,
    chooseSubalterno,
    goBack,
    restart,
    updateAnswer,
    submit,
    unansweredQuestionIds,
    showValidationErrors,
    validationAttempt,
    remainingSeconds,
    isEvaluationExpired,
    trackingStatus,

  };
}
