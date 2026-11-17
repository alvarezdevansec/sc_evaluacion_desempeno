
export class GraphQLAuthenticationError extends Error {
  constructor(message = 'Token de acceso inválido.') {
    super(message);
    this.name = 'GraphQLAuthenticationError';
  }
}

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ?? 'http://localhost:4000/graphql';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  let payload: GraphQLResponse<T>;

  try {
    payload = (await response.json()) as GraphQLResponse<T>;
  } catch {
    throw new Error(
      `La API GraphQL devolvió una respuesta no válida (HTTP ${response.status}).`,
    );
  }

  const errorMessage = payload.errors?.[0]?.message;

  if (
    response.status === 401 ||
    response.status === 403 ||
    errorMessage?.toLowerCase().includes('token de acceso inválido')
  ) {
    throw new GraphQLAuthenticationError(
      errorMessage ?? 'Token de acceso inválido.',
    );
  }

  if (!response.ok) {
    throw new Error(
      errorMessage ??
      `Error HTTP ${response.status} al consultar GraphQL.`,
    );
  }

  if (payload.errors?.length) {
    throw new Error(
      errorMessage ?? 'Error al ejecutar la operación GraphQL.',
    );
  }

  if (!payload.data) {
    throw new Error('La API GraphQL no devolvió datos.');
  }

  return payload.data;
}
