
export interface AuthenticatedUser {
    idServidorPublico: number;
    idInstitucion: number;
    idEnlace: number;
    idEvaluador: number | null;
}

export interface GraphQLContext {
    user: AuthenticatedUser | null;
    token: string | null;
}
