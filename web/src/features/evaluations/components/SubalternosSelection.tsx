'use client';

import { useEffect, useState } from 'react';
import BrandHeader from '@/components/BrandHeader';
import { obtenerSubalternosEvaluacion } from '@/services/evaluations';
import type { PublicServant } from '@/types';

interface SubalternosSelectionProps {
  token: string;
  idEvaluador: number;
  onBack: () => void;
  onSelect: (person: PublicServant) => void;
}

export default function SubalternosSelection({
  token,
  idEvaluador,
  onBack,
  onSelect,
}: SubalternosSelectionProps) {
  const [servidores, setServidores] = useState<PublicServant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function cargarSubalternos() {
      setIsLoading(true);
      setError(null);

      try {
        if (!token?.trim()) {
          throw new Error(
            'SubalternosSelection recibió un token vacío desde EvaluationApp.'
          );
        }

        if (!Number.isInteger(idEvaluador) || idEvaluador <= 0) {
          throw new Error('El identificador del evaluador no es válido.');
        }

        const resultado = await obtenerSubalternosEvaluacion(
          token,
          idEvaluador
        );

        if (!active) return;

        const servidoresPublicos: PublicServant[] = resultado.map((person) => ({
          idServidorPublico: person.idServidorPublico,
          nombre: person.nombre,
          cargo: person.cargo,
          area: person.area ?? person.institucion,
          estadoEvaluacion: person.estadoEvaluacion,
        }));

        setServidores(servidoresPublicos);
      } catch (err) {
        if (!active) return;

        setServidores([]);
        setError(
          err instanceof Error
            ? err.message
            : 'No fue posible cargar los servidores públicos.'
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void cargarSubalternos();

    return () => {
      active = false;
    };
  }, [token, idEvaluador]);

  const direccion = servidores[0]?.area ?? 'Servidores públicos';

  return (
    <main className="form-container">
      <header className="header">
        <BrandHeader />
        <h1>
          <span>Evaluación a Subalternos</span>
        </h1>
        <p>Seleccione el servidor público que desea evaluar.</p>
      </header>

      <section className="subalternos-section">
        <button className="back-button" type="button" onClick={onBack}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6M9 12h12" />
          </svg>
          Regresar
        </button>

        <div className="subalternos-header">
          <div>
            <span className="subalternos-label">SERVIDORES PÚBLICOS</span>
            <h2>{direccion}</h2>
            <p>Seleccione el servidor público que desea evaluar.</p>
          </div>

          <div className="subalternos-count">
            <strong>{isLoading ? '—' : servidores.length}</strong>
            <span>Servidores Públicos</span>
          </div>
        </div>

        <div className="subalternos-table-container">
          <table className="subalternos-table">
            <thead>
              <tr>
                <th className="column-number">#</th>
                <th>Servidor Público</th>
                <th>Cargo</th>
                <th className="column-action">Acción</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4}>Cargando servidores públicos...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} role="alert">
                    {error}
                  </td>
                </tr>
              ) : servidores.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    No hay servidores públicos disponibles para evaluar.
                  </td>
                </tr>
              ) : (
                servidores.map((person, index) => (
                  <tr key={person.idServidorPublico}>
                    <td className="column-number">
                      <span className="row-number">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </td>

                    <td>
                      <div className="subalterno-name">
                        <div className="subalterno-avatar">
                          {person.nombre.charAt(0).toUpperCase()}
                        </div>
                        <strong>{person.nombre}</strong>
                      </div>
                    </td>

                    <td>
                      <span className="subalterno-cargo">
                        {person.cargo}
                      </span>
                    </td>

                    <td className="column-action">
                      {person.estadoEvaluacion === 'EVALUADO' ? (
                        <span
                          className="subalterno-evaluado"
                          role="status"
                        >
                          Evaluado
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="subalterno-button"
                          onClick={() => onSelect(person)}
                        >
                          Evaluar <span>›</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
