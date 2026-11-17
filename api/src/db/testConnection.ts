
import { pool } from './pool.js';

async function testPool() {
  try {
    console.log('\n=== PRUEBA DEL POOL POSTGRESQL ===');

    // 1. Validar conexión y esquema activo
    const connection = await pool.query(`
      SELECT
        current_database() AS database,
        current_user AS usuario,
        inet_server_addr() AS servidor,
        current_schema() AS esquema_actual,
        current_setting('search_path') AS search_path
    `);

    console.table(connection.rows);

    // 2. Validar existencia y permisos de las tablas
    const tables = await pool.query(
      `
      SELECT
        table_name,
        has_table_privilege(
          current_user,
          format('%I.%I', table_schema, table_name),
          'SELECT'
        ) AS puede_consultar
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
      `,
      ['sc_evaluacion_desempeno']
    );

    console.log('\n=== TABLAS Y PERMISOS ===');
    console.table(tables.rows);

    // 3. Comprobar acceso mediante search_path
    const access = await pool.query(`
      SELECT
        to_regclass('tb_escalalikert') AS tb_escalalikert,
        to_regclass('tb_preguntas_evaluacion') AS tb_preguntas_evaluacion,
        to_regclass('tb_resultados_evaluacion') AS tb_resultados_evaluacion,
        to_regclass('tb_seguimiento_evaluacion') AS tb_seguimiento_evaluacion,
        to_regclass('tb_tipo_evaluacion') AS tb_tipo_evaluacion
    `);

    console.log('\n=== ACCESO MEDIANTE SEARCH_PATH ===');
    console.table(access.rows);

    console.log('\nPRUEBA DEL POOL FINALIZADA.');

  } catch (error) {
    console.error('\nERROR EN LA PRUEBA DEL POOL:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testPool();
