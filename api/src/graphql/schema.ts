
import { gql } from 'graphql-tag';
import { evaluacionesTypeDefs } from '../modules/evaluaciones/evaluaciones.schema.js';

const baseTypeDefs = gql`

  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }

`;

export const typeDefs = [baseTypeDefs, evaluacionesTypeDefs];
