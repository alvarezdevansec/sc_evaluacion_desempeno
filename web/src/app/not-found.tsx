import Image from 'next/image';
import Link from 'next/link';

export default function NotFound() {
    return (
        <main className="institutional-error" aria-labelledby="not-found-title">
            <section className="institutional-error__card">
                <Image
                    src="/assets/logo-ansec.png"
                    alt="ANSEC - Administración Nacional de Servicio Civil"
                    width={320}
                    height={137}
                    priority
                    className="institutional-error__logo"
                />

                <div className="institutional-error__divider" aria-hidden="true" />

                <p className="institutional-error__code">404</p>
                <h1 id="not-found-title" className="institutional-error__title">
                    Página no encontrada
                </h1>
                <p className="institutional-error__description">
                    El enlace al que intenta acceder no es válido o ha dejado de estar disponible.
                    Verifique la dirección e inténtelo nuevamente.
                </p>

                <Link href="/" className="institutional-error__button">
                    Regresar al inicio
                </Link>
            </section>

            <footer className="institutional-error__footer" aria-hidden="true">
                <span />
                <span />
            </footer>
        </main>
    );
}
