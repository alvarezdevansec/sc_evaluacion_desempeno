
import { evaluacionesResolvers } from '../modules/evaluaciones/evaluaciones.resolvers.js';

export const resolvers = {
  Query: {
    ...evaluacionesResolvers.Query,
  },

  Mutation: {
    ...evaluacionesResolvers.Mutation,
  },
};
