'use client';

import BrandHeader from '@/components/BrandHeader';
import EvaluationTimer from './EvaluationTimer';
import { useEffect, type FormEvent } from 'react';
import TypeIcon from '@/components/TypeIcon';
// import { servidorPublico } from '@/data';
import type { EvaluationAnswers, EvaluationTypeId, PublicServant, QuestionView, ServidorPublicoPorToken } from '@/types';


type EvaluationTrackingStatus =
  | 'INICIADA'
  | 'EN PROCESO'
  | 'PAUSADA'
  | 'FINALIZADA';

interface EvaluationFormProps {
  servidorPublico: ServidorPublicoPorToken;
  trackingStatus: EvaluationTrackingStatus | null;
  unansweredQuestionIds: number[];
  validationAttempt: number;
  showValidationErrors: boolean;
  evaluationType: EvaluationTypeId;
  evaluationTitle: string;
  selectedSubalterno: PublicServant | null;
  questions: QuestionView[];
  answers: EvaluationAnswers;
  answeredCount: number;
  isSubmitting: boolean;
  progress: number;
  remainingSeconds: number;
  isEvaluationExpired: boolean;
  onBack?: () => void;
  onAnswer: (questionId: number, value: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function EvaluationForm({
  servidorPublico,
  trackingStatus,
  unansweredQuestionIds,
  validationAttempt,
  showValidationErrors,
  evaluationType,
  evaluationTitle,
  selectedSubalterno,
  questions,
  answers,
  answeredCount,
  isSubmitting,
  progress,
  remainingSeconds,
  isEvaluationExpired,
  onBack,
  onAnswer,
  onSubmit,
}: EvaluationFormProps) {

  const canAnswer =
    trackingStatus === 'INICIADA' || trackingStatus === 'EN PROCESO';

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;

  };


  useEffect(() => {
    if (!showValidationErrors || unansweredQuestionIds.length === 0) {
      return;
    }

    const firstUnansweredId = unansweredQuestionIds[0];

    const frameId = requestAnimationFrame(() => {
      const questionElement = document.getElementById(
        `question-${firstUnansweredId}`,
      );

      if (!questionElement) return;

      questionElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      const firstRadio = questionElement.querySelector<HTMLInputElement>(
        'input[type="radio"]',
      );

      firstRadio?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frameId);

  }, [showValidationErrors, unansweredQuestionIds, validationAttempt,]);


  return (
    <main className="form-container">
      <header className="header evaluation-header">
        <BrandHeader />

        <EvaluationTimer
          remainingSeconds={remainingSeconds}
          isExpired={isEvaluationExpired}
        />

        <h1><span>{evaluationTitle}</span></h1>
        <div className="intro-card">
          <div className="intro-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 10.5V16" />
              <circle cx="12" cy="7.5" r="1" fill="currentColor" />
            </svg>
          </div>
          <div>
            <p>Su opinión es fundamental para seguir fortaleciendo nuestro trabajo y construir una institución cada vez más eficiente y comprometida.</p>
            <strong>A continuación, responda las siguientes preguntas de acuerdo a los <b>CRITERIOS DE EVALUACIÓN.</b></strong>
          </div>
        </div>
      </header>


      {evaluationType === 2 && onBack && (
        <button className="back-button" type="button" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6M9 12h12" />
          </svg>
          Regresar a servidores
        </button>
      )}

      <form onSubmit={onSubmit}>
        <section className="employee-card">
          <div className="field-group">
            <div className="field-icon"><TypeIcon type={3} /></div>
            <div className="user-data">
              <span>Institución</span>
              <strong>{servidorPublico.institucion}</strong>
            </div>
          </div>
          <div className="field-group">
            <div className="field-icon"><TypeIcon type={1} /></div>
            <div className="user-data">
              <span>{evaluationType === 2 ? 'Servidor Público evaluado' : 'Servidor Público'}</span>
              <strong>{selectedSubalterno?.nombre ?? servidorPublico.nombre}</strong>
            </div>
          </div>
        </section>

        <section className="progress-section">
          <div className="progress-header">
            <span>Progreso de evaluación</span>
            <strong>{answeredCount} de {questions.length}</strong>
          </div>
          <div className="progress-bar">
            <div className="progress-value" style={{ width: `${progress}%` }} />
          </div>
        </section>

        <section className="questions">
          {questions.map((question, index) => {
            const isUnanswered = unansweredQuestionIds.includes(question.id);
            const isFirstUnanswered =
              isUnanswered && unansweredQuestionIds[0] === question.id;

            const questionStatusClass =
              showValidationErrors && isFirstUnanswered
                ? 'question-card--error'
                : showValidationErrors && isUnanswered
                  ? 'question-card--warning'
                  : '';

            return (
              <article
                id={`question-${question.id}`}
                className={`question-card ${questionStatusClass}`}
                key={question.id}
              >
                <div className="question-number">
                  {String(index + 1).padStart(2, '0')}
                </div>

                <div className="question-content">
                  <p className="question-text">{question.text}</p>

                  <div className="answers">
                    {question.answers.map((answer) => {
                      const isSelected =
                        answers[question.id] !== undefined &&
                        answers[question.id] === answer.puntaje;

                      return (
                        <label
                          className={`answer ${isSelected ? 'selected' : ''}`}
                          key={answer.id}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={answer.puntaje}
                            checked={isSelected}
                            disabled={!canAnswer || isEvaluationExpired}
                            onChange={() => onAnswer(question.id, answer.puntaje)}
                          />

                          <span className="radio" />
                          <span className="answer-text">{answer.respuesta}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <div className="submit-container">
          <button
            type="submit"
            className="primary-button"
            disabled={
              isSubmitting ||
              trackingStatus !== 'EN PROCESO' ||
              isEvaluationExpired
            }
          >
            {isSubmitting ? 'Registrando...' : 'Enviar Evaluación'}
            <span>›</span>
          </button>
          <p>
            {answeredCount === questions.length
              ? 'Todas las preguntas han sido respondidas.'
              : `Faltan ${questions.length - answeredCount} preguntas por responder.`}
          </p>
        </div>
      </form>
    </main>
  );
}
