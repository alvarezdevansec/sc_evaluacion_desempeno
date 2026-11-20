
'use client';

import BrandHeader from '@/components/BrandHeader';
import TypeIcon from '@/components/TypeIcon';
import type { EvaluationType, EvaluationTypeId } from '@/types';

interface EvaluationAvailability {
  autoevaluacionRealizada: boolean;
  subalternosEvaluados: number;
  totalSubalternos: number;
  evaluacionInstitucionalRealizada: boolean;
}

interface EvaluationSelectionProps {
  types: EvaluationType[];
  isLoading: boolean;
  error: string | null;
  onChooseType: (id: EvaluationTypeId) => void;
  availability: EvaluationAvailability;
}

export default function EvaluationSelection({
  types,
  isLoading,
  error,
  onChooseType,
  availability,
}: EvaluationSelectionProps) {

  const puedeIniciarEvaluacion = (id: EvaluationTypeId): boolean => {
    switch (id) {
      case 1:
        return !availability.autoevaluacionRealizada;

      case 2:
        return (
          availability.totalSubalternos > 0 &&
          availability.subalternosEvaluados <
          availability.totalSubalternos
        );

      case 3:
        return !availability.evaluacionInstitucionalRealizada;

      default:
        return false;
    }
  };

  const obtenerMensajeEstado = (id: EvaluationTypeId): string => {
    switch (id) {
      case 1:
      case 3:
        return 'Evaluación Realizada';

      case 2:
        // return `Subalternos Evaluados: ${availability.subalternosEvaluados} de ${availability.totalSubalternos}`;
        return `Subalternos Evaluados`;
      default:
        return '';
    }
  };

  return (
    <main className="evaluation-selection">
      <header className="selection-header">
        <BrandHeader />
        <h1>
          Evaluación del <span>Desempeño 2026</span>
        </h1>
        <p>Seleccione el tipo de evaluación que desea realizar</p>
      </header>

      {isLoading ? (
        <section className="evaluation-options">
          <p>Cargando tipos de evaluación...</p>
        </section>
      ) : error ? (
        <section className="evaluation-options">
          <p role="alert">{error}</p>
        </section>
      ) : types.length === 0 ? (
        <section className="evaluation-options">
          <p>No hay tipos de evaluación disponibles.</p>
        </section>
      ) : (
        <section className="evaluation-options">
          {types.map((item) => {
            const puedeIniciar = puedeIniciarEvaluacion(item.id);

            return (
              <article
                className={`evaluation-card ${!puedeIniciar ? 'evaluation-card-disabled' : ''}`}
                key={item.id}
                role={puedeIniciar ? 'button' : undefined}
                tabIndex={puedeIniciar ? 0 : -1}
                aria-disabled={!puedeIniciar}
                onClick={() => {
                  if (puedeIniciar) {
                    onChooseType(item.id);
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    puedeIniciar &&
                    (event.key === 'Enter' || event.key === ' ')
                  ) {
                    event.preventDefault();
                    onChooseType(item.id);
                  }
                }}
              >
                <div className="evaluation-icon">
                  <TypeIcon type={item.id} />
                </div>

                <h2>{item.tipo}</h2>
                <p>{item.descripcion}</p>
                <br />

                {puedeIniciar ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onChooseType(item.id);
                    }}
                  >
                    Iniciar Evaluación <span>›</span>
                  </button>
                ) : (
                  <p className="evaluation-status" role="status">
                    {obtenerMensajeEstado(item.id)}
                  </p>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
