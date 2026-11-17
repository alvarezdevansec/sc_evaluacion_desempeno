import Image from 'next/image';

export default function HomePage() {
    return (
        <main className="institutional-home" aria-label="Administración Nacional de Servicio Civil">
            <Image
                src="/assets/logo-ansec.png"
                alt="ANSEC - Administración Nacional de Servicio Civil"
                width={420}
                height={180}
                priority
                className="institutional-home__logo"
            />
        </main>
    );
}
