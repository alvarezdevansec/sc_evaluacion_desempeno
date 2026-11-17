import type { EvaluationQuestion, EvaluationType, LikertOption, PublicServant, ServidorProfile } from '@/types';
import evaluationTypes from './tipoEvaluacion';
import questions from './preguntasEvaluacion';
import likert from './escalaLikert';
import servants from './subAlternos';
import profile from './servidoresPublicos';

export const tipoEvaluacion = evaluationTypes as EvaluationType[];
export const preguntasEvaluacion = questions as EvaluationQuestion[];
export const escalaLikert = likert as LikertOption[];
export const subAlternos = servants as PublicServant[];
export const servidorPublico = profile as ServidorProfile;
