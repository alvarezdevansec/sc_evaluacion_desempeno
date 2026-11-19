import { EvaluationError } from '../../errors/EvaluationError.js';
import type { AuthenticatedUser } from '../../auth/auth.types.js';
import { evaluacionesRepository } from './evaluaciones.repository.js';

const evaluationPermissions: Record<number, number[]> = {
    1: [2, 3],
    2: [1, 2, 3],
    3: [1, 3],
};

export function validarPermisoEvaluacion(
    usuario: AuthenticatedUser,
    tipoEvaluacionId: number,
): void {
    const permitidas = evaluationPermissions[usuario.idEnlace] ?? [];

    if (!permitidas.includes(tipoEvaluacionId)) {
        throw new EvaluationError(
            'No tiene autorización para realizar este tipo de evaluación.',
        );
    }
}

export async function validarServidorEvaluado(
    usuario: AuthenticatedUser,
    tipoEvaluacionId: number,
    idServidorPublico: number,
): Promise<void> {
    validarPermisoEvaluacion(usuario, tipoEvaluacionId);

    if (!Number.isSafeInteger(idServidorPublico) || idServidorPublico <= 0) {
        throw new EvaluationError('El servidor público no es válido.');
    }

    // Autoevaluación e institucional: el servidor es el propio usuario.
    if (tipoEvaluacionId === 1 || tipoEvaluacionId === 3) {
        if (usuario.idServidorPublico !== idServidorPublico) {
            throw new EvaluationError(
                'No tiene autorización para evaluar a este servidor público.',
            );
        }

        return;
    }

    // Evaluación de subalternos: comprobar la relación jerárquica.
    const esSubalterno =
        await evaluacionesRepository.esSubalternoAutorizado(
            usuario.idServidorPublico,
            idServidorPublico,
        );

    if (!esSubalterno) {
        throw new EvaluationError(
            'El servidor público seleccionado no pertenece a sus subalternos autorizados.',
        );
    }
}
