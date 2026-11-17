
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const envPath = fileURLToPath(
  new URL('../.env', import.meta.url)
);

dotenv.config({ path: envPath });

function obtenerVariable(
  nombre: string,
  valorPredeterminado?: string
): string {
  const valor = process.env[nombre] ?? valorPredeterminado;

  if (!valor?.trim()) {
    throw new Error(`Falta configurar ${nombre}`);
  }

  return valor.trim();
}

function obtenerPuerto(
  nombre: string,
  valorPredeterminado: number
): number {
  const valor = Number(
    process.env[nombre] ?? valorPredeterminado
  );

  if (!Number.isInteger(valor) || valor < 1 || valor > 65535) {
    throw new Error(`El puerto ${nombre} no es válido`);
  }

  return valor;
}

function obtenerBooleano(
  nombre: string,
  valorPredeterminado = false
): boolean {
  const valor = process.env[nombre];

  if (valor === undefined) {
    return valorPredeterminado;
  }

  if (valor.toLowerCase() === 'true') return true;
  if (valor.toLowerCase() === 'false') return false;

  throw new Error(`${nombre} debe ser true o false`);
}

export const config = {
  port: obtenerPuerto('PORT', 4000),

  corsOrigin: obtenerVariable(
    'CORS_ORIGIN',
    'http://localhost:3000'
  ),

  database: {

    connection: obtenerVariable('DB_CONNECTION', 'pgsql'),
    host: obtenerVariable('DB_HOST'),
    port: obtenerPuerto('DB_PORT', 5432),
    database: obtenerVariable('DB_DATABASE'),
    schema: obtenerVariable('DB_SCHEMA', 'sc_evaluacion_desempeno'),
    user: obtenerVariable('DB_USERNAME'),
    password: obtenerVariable('DB_PASSWORD'),
    ssl: obtenerBooleano('DB_SSL', false),

  },
};
