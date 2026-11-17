# ANSEC — Evaluación del Desempeño 2026

Migración inicial del proyecto adjunto a un monorepo **Next.js App Router + TypeScript** y **Node.js + Express + GraphQL + PostgreSQL**.

## Estructura

```text
.
├── web/
│   ├── public/assets/             # Logotipos institucionales
│   └── src/
│       ├── app/                   # App Router, layout y estilos globales
│       ├── components/            # Vistas y componentes React
│       ├── data/                  # Datos originales tipados (mock)
│       ├── lib/                   # Lógica de evaluación
│       ├── services/              # API GraphQL y adaptador mock
│       └── types/
├── api/
│   ├── src/
│   │   ├── db/                    # Pool PostgreSQL
│   │   ├── graphql/               # Schema y resolvers
│   │   └── repositories/          # Persistencia CRUD
│   └── sql/                       # DDL inicial
└── package.json                   # npm workspaces
```

## Requisitos

- Node.js 20.9 o superior (recomendado Node 22 LTS).
- PostgreSQL 14 o superior.
- npm 10 o superior.

## Instalación

```bash
npm install
cp api/.env.example api/.env
cp web/.env.example web/.env.local
```

Completar `api/.env` con los valores reales. Ejecutar el DDL:

```bash
psql -h DB_HOST -U DB_USERNAME -d DB_DATABASE -f api/sql/001_create_evaluations.sql
```

En Windows PowerShell se puede copiar con `Copy-Item api/.env.example api/.env` y `Copy-Item web/.env.example web/.env.local`.

## Ejecución

```bash
npm run dev
```

- Frontend: http://localhost:3000
- GraphQL Playground/endpoint: http://localhost:4000/graphql
- Health check: http://localhost:4000/health

## Mock data

El frontend inicia con `NEXT_PUBLIC_USE_MOCKS=true`. Las preguntas, escala Likert, tipos de evaluación y servidores se conservaron desde el proyecto de origen. Los envíos simulados se guardan en `localStorage` del navegador, por lo que puedes probar los flujos sin PostgreSQL.

Cuando el backend y la base de datos estén listos, cambia a:

```env
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
```

Reinicia Next.js después de modificar variables `NEXT_PUBLIC_*`.

## CRUD GraphQL

- `Query.evaluations`: lista de evaluaciones.
- `Query.evaluation(id)`: obtiene una evaluación.
- `Mutation.createEvaluation(input)`: crea.
- `Mutation.updateEvaluation(id, input)`: actualiza.
- `Mutation.deleteEvaluation(id)`: elimina.

Ejemplo de mutación:

```graphql
mutation {
  createEvaluation(input: {
    tipoEvaluacionId: 1
    respuestas: [{ preguntaId: 1, valor: 5 }]
  }) {
    id
    tipoEvaluacionId
    createdAt
  }
}
```

## Notas de integración y seguridad

1. El DDL es una tabla inicial para registrar respuestas; debe alinearse con el modelo definitivo de ANSEC (IDs reales, catálogos, relación con persona/servidor, institución, período y auditoría).
2. No se incluyeron credenciales. `DB_PASSWORD` debe permanecer en backend/.env y nunca exponerse mediante variables `NEXT_PUBLIC_*`.
3. Antes de producción, agregar autenticación/autorización, validación de identidad y permisos, rate limiting, protección CSRF según el esquema de autenticación, logging/auditoría, paginación y pruebas automatizadas.
4. La migración conserva las hojas de estilo originales como base y agrega reglas responsive. Se deben validar visualmente las vistas con los datos reales y navegadores objetivo.
5. El botón **Regresar** está disponible tanto en la selección de subalternos como durante la evaluación de cada subalterno.
