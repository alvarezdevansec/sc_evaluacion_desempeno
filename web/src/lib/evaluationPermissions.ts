
import type { EvaluationTypeId } from '@/types';

const evaluationPermissions: Record<number, EvaluationTypeId[]> = {
    1: [2, 3], // Subalternos - Institucion 
    2: [1, 2, 3], // Autoevaluacion - Subalternos - Institucion 
    3: [1, 3], // Autoevaluacion - Institucion 
};

export function getAllowedEvaluations(
    idEnlace: number,
): EvaluationTypeId[] {
    return evaluationPermissions[idEnlace] ?? [];
}

export function canAccessEvaluation(
    idEnlace: number,
    evaluationId: EvaluationTypeId,
): boolean {
    return getAllowedEvaluations(idEnlace).includes(evaluationId);
}

