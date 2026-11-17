'use client';

import type { ServidorPublicoPorToken } from '@/types';

import { getAllowedEvaluations } from '@/lib/evaluationPermissions';
import { useNotifications } from '@/components/notifications/NotificationProvider';

import { useEvaluationFlow } from '@/features/evaluations/hooks/useEvaluationFlow';
import EvaluationSelection from '@/features/evaluations/components/EvaluationSelection';
import SubalternosSelection from '@/features/evaluations/components/SubalternosSelection';
import EvaluationForm from '@/features/evaluations/components/EvaluationForm';
import EvaluationResult from '@/features/evaluations/components/EvaluationResult';
import CountdownOverlay from '@/features/evaluations/components/CountdownOverlay';


interface EvaluationAppProps {
  servidorPublico: ServidorPublicoPorToken;
  token: string;
}

export default function EvaluationApp({
  servidorPublico,
  token,
}: EvaluationAppProps) {
  const {
    remainingSeconds,
    isEvaluationExpired,
    trackingStatus,
    evaluationType,
    selectedSubalterno,
    questions,
    answers,
    submitted,
    isSubmitting,
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
    evaluationTypes,
    isLoadingData,
    isLoadingQuestions,
    error,
    unansweredQuestionIds,
    showValidationErrors,
    validationAttempt,
    evaluationAvailability,
  } = useEvaluationFlow({
    servidorPublico,
    token,
  });


  // Notificaciones 
  const { notify, confirm } = useNotifications();

  //Accesos a las evaluaciones
  const tiposPermitidos = getAllowedEvaluations(
    servidorPublico.idEnlace,
  );

  const evaluationTypesPermitidos = evaluationTypes.filter(
    (item) => tiposPermitidos.includes(item.id),
  );

  const showSubalternos = evaluationType === 2 && selectedSubalterno === null;
  const showEvaluation = evaluationType !== null && !showSubalternos;

  return (
    <div className="app">

      <div className="top-line" />

      {evaluationType === null && (
        <EvaluationSelection
          types={evaluationTypesPermitidos}
          isLoading={isLoadingData || evaluationAvailability === null}
          error={error}
          onChooseType={chooseType}
          availability={evaluationAvailability}
        />
      )}


      {showSubalternos && (
        <SubalternosSelection
          token={token}
          idEvaluador={servidorPublico.idServidorPublico}
          onBack={() => void restart(false)}
          onSelect={chooseSubalterno}
        />
      )}

      {showEvaluation && submitted && evaluationType !== null && (
        <EvaluationResult
          evaluationType={evaluationType}
          onRestart={() => restart(evaluationType === 2)}
        />
      )}

      {showEvaluation && !submitted && !isLoadingQuestions && selectedEvaluation && (
        <EvaluationForm
          servidorPublico={servidorPublico}
          remainingSeconds={remainingSeconds}
          isEvaluationExpired={isEvaluationExpired}
          trackingStatus={trackingStatus}
          unansweredQuestionIds={unansweredQuestionIds}
          validationAttempt={validationAttempt}
          showValidationErrors={showValidationErrors}
          evaluationType={evaluationType}
          evaluationTitle={selectedEvaluation.tipo}
          selectedSubalterno={selectedSubalterno}
          questions={questions}
          answers={answers}
          answeredCount={answeredCount}
          isSubmitting={isSubmitting}
          progress={progress}
          onBack={evaluationType === 2 ? goBack : undefined}
          onAnswer={updateAnswer}
          onSubmit={submit}
        />
      )}

      <footer><div className="footer-gold" /><div className="footer-blue" /></footer>

      {countdown !== null && <CountdownOverlay countdown={countdown} />}

    </div>


  );

}
