export type EvaluationErrorCode = 'INVALID_INPUT' | 'NOT_FOUND';

export class EvaluationError extends Error {
  constructor(
    message: string,
    public readonly code: EvaluationErrorCode = 'INVALID_INPUT'
  ) {
    super(message);
    this.name = 'EvaluationError';
  }
}
