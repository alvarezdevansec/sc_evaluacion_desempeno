export function getOrCreateEvaluationSessionId(
    idEvaluador: number,
    idInstitucion: number,
): string {
    console.log('[SESSION] Ejecutando getOrCreateEvaluationSessionId');

    if (typeof window === 'undefined') {
        throw new Error('La sesión de evaluación requiere un navegador.');
    }

    console.log('[SESSION] Evaluador:', idEvaluador);
    console.log('[SESSION] Institución:', idInstitucion);

    const storageKey = [
        'ansec-evaluation-session',
        '2026',
        idInstitucion,
        idEvaluador,
    ].join(':');

    console.log('[SESSION] Clave:', storageKey);

    const existingSessionId = window.localStorage.getItem(storageKey);

    if (existingSessionId) {
        console.log('[SESSION] UUID recuperado:', existingSessionId);
        return existingSessionId;
    }

    const newSessionId = crypto.randomUUID();

    window.localStorage.setItem(storageKey, newSessionId);

    console.log('[SESSION] UUID creado:', newSessionId);

    return newSessionId;
}