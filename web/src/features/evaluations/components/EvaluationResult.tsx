interface EvaluationResultProps {
  evaluationType: number;
  onRestart: () => Promise<void>;
}

export default function EvaluationResult({ evaluationType, onRestart }: EvaluationResultProps) {
  return (
    <main className="result-container">
      <section className="result-card">
        <div className="result-icon">✓</div>
        <h1>Evaluación completada</h1>
        <p className="result-subtitle">La evaluación de desempeño ha sido registrada correctamente.</p>
        <button type="button" className="primary-button" onClick={onRestart}>
          {evaluationType === 2
            ? 'Volver a subalternos'
            : 'Aceptar'}
        </button>
      </section>
    </main>
  );
}
