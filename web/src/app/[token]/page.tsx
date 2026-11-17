import { notFound } from 'next/navigation';
import { obtenerServidorPublicoPorToken } from '@/services/evaluations';
import { GraphQLAuthenticationError } from '@/services/graphqlClient';
import EvaluationApp from '@/components/EvaluationApp';

export default async function HomePage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;

    let servidorPublico;

    try {
        servidorPublico = await obtenerServidorPublicoPorToken(token);
    } catch (error) {
        if (error instanceof GraphQLAuthenticationError) {
            notFound();
        }

        throw error;
    }

    if (!servidorPublico) {
        notFound();
    }

    return (
        <EvaluationApp
            servidorPublico={servidorPublico}
            token={token}
        />
    );
}