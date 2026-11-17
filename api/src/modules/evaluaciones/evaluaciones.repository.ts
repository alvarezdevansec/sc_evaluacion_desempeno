import { pool } from '../../db/pool.js';
import type {
    TipoEvaluacion, PreguntaEvaluacion, EscalaLikert, GuardarEvaluacionInput, ActualizarEvaluacionInput, ResultadoEvaluacion,
    SeguimientoEvaluacion, CrearSeguimientoInput, ActualizarOrdenSeguimientoInput, TemporizadorEvaluacion, ResultadoOperacionEvaluacion,
    ServidorPublicoPorToken, SubalternoEvaluacion
} from './evaluaciones.types.js';


const SEGUIMIENTO_RETURNING = `
    id::text AS "id",
    id_sesion::text AS "idSesion",
    id_servidor_publico AS "idServidorPublico",
    id_tipo_evaluacion AS "tipoEvaluacionId",
    id_evaluador AS "idEvaluador",
    estado,
    preguntas_ordenadas AS "preguntasOrdenadas",
    opciones_ordenadas AS "opcionesOrdenadas",
    tiempo_evaluacion AS "tiempoEvaluacion",
    TO_CHAR(fecha_inicio, 'YYYY-MM-DD HH24:MI:SS') AS "fechaInicio",
    TO_CHAR(fecha_ultima_reanudacion, 'YYYY-MM-DD HH24:MI:SS') AS "fechaUltimaReanudacion",
    TO_CHAR(fecha_finalizacion, 'YYYY-MM-DD HH24:MI:SS') AS "fechaFinalizacion"
`;


export const evaluacionesRepository = {

    async obtenerTipos(): Promise<TipoEvaluacion[]> {

        const { rows } = await pool.query<TipoEvaluacion>(`SELECT id, tipo, descripcion FROM sc_evaluacion_desempeno.tb_tipo_evaluacion ORDER BY id`);
        return rows;
    },

    async obtenerPreguntas(idEvaluacion: number): Promise<PreguntaEvaluacion[]> {

        const { rows } = await pool.query<PreguntaEvaluacion>(`SELECT id, id_evaluacion AS "idEvaluacion", pregunta FROM tb_preguntas_evaluacion WHERE id_evaluacion = $1 ORDER BY id`, [idEvaluacion]);
        return rows;
    },


    async obtenerEscalaLikert(): Promise<EscalaLikert[]> {

        const { rows } = await pool.query<EscalaLikert>(` SELECT id, respuesta, puntaje FROM tb_escalalikert ORDER BY puntaje DESC`);
        return rows;
    },

    async obtenerDisponibilidadEvaluaciones(idServidorPublico: number) {
        const sql = `
        SELECT
            EXISTS (
                SELECT 1
                FROM sc_evaluacion_desempeno.tb_seguimiento_evaluacion se
                WHERE se.id_servidor_publico = $1
                  AND se.id_tipo_evaluacion = 1
                  AND se.id_evaluador IS NULL
                  AND se.estado = 'FINALIZADA'
                  AND EXISTS (
                      SELECT 1
                      FROM sc_evaluacion_desempeno.tb_resultados_evaluacion re
                      WHERE re.id_sesion = se.id_sesion
                        AND re.id_tipo_evaluacion = se.id_tipo_evaluacion
                        AND re.id_servidor_publico = se.id_servidor_publico
                        AND re.id_evaluador IS NULL
                  )
            ) AS "autoevaluacionRealizada",

            (
                SELECT COUNT(DISTINCT l.id_servidor_publico)::INTEGER
                FROM sc_evaluacion_desempeno.tb_linked_evaluacion l
                WHERE l.id_evaluador = $1
            ) AS "totalSubalternos",

            (
                SELECT COUNT(DISTINCT l.id_servidor_publico)::INTEGER
                FROM sc_evaluacion_desempeno.tb_linked_evaluacion l
                WHERE l.id_evaluador = $1
                  AND EXISTS (
                      SELECT 1
                      FROM sc_evaluacion_desempeno.tb_seguimiento_evaluacion se
                      WHERE se.id_servidor_publico = l.id_servidor_publico
                        AND se.id_tipo_evaluacion = 2
                        AND se.id_evaluador = $1
                        AND se.estado = 'FINALIZADA'
                        AND EXISTS (
                            SELECT 1
                            FROM sc_evaluacion_desempeno.tb_resultados_evaluacion re
                            WHERE re.id_sesion = se.id_sesion
                              AND re.id_tipo_evaluacion = se.id_tipo_evaluacion
                              AND re.id_servidor_publico = se.id_servidor_publico
                              AND re.id_evaluador = $1
                        )
                  )
            ) AS "subalternosEvaluados",

            EXISTS (
                SELECT 1
                FROM sc_evaluacion_desempeno.tb_seguimiento_evaluacion se
                WHERE se.id_servidor_publico = $1
                  AND se.id_tipo_evaluacion = 3
                  AND se.id_evaluador IS NULL
                  AND se.estado = 'FINALIZADA'
                  AND EXISTS (
                      SELECT 1
                      FROM sc_evaluacion_desempeno.tb_resultados_evaluacion re
                      WHERE re.id_sesion = se.id_sesion
                        AND re.id_tipo_evaluacion = se.id_tipo_evaluacion
                        AND re.id_servidor_publico = se.id_servidor_publico
                        AND re.id_evaluador IS NULL
                  )
            ) AS "evaluacionInstitucionalRealizada"
    `;

        const { rows } = await pool.query(sql, [idServidorPublico]);

        return rows[0];
    },

    async obtenerRespuestas(idSesion: string, tipoEvaluacionId: number, idServidorPublico: number, idEvaluador: number | null): Promise<ResultadoEvaluacion[]> {

        const { rows } = await pool.query<ResultadoEvaluacion>(`
            SELECT id::text AS "id", id_sesion::text AS "idSesion", id_tipo_evaluacion AS "tipoEvaluacionId",
                id_pregunta AS "preguntaId", id_respuesta AS "respuestaId", puntaje,
                id_servidor_publico AS "idServidorPublico", id_evaluador AS "idEvaluador", id_institucion AS "idInstitucion"
            FROM sc_evaluacion_desempeno.tb_resultados_evaluacion
            WHERE id_sesion = $1 AND id_tipo_evaluacion = $2 AND id_servidor_publico = $3 AND id_evaluador IS NOT DISTINCT FROM $4
            ORDER BY id_pregunta`, [idSesion, tipoEvaluacionId, idServidorPublico, idEvaluador,]);

        return rows;
    },


    async crearSeguimiento(input: CrearSeguimientoInput): Promise<SeguimientoEvaluacion> {
        const sqlInsert = `
        INSERT INTO sc_evaluacion_desempeno.tb_seguimiento_evaluacion
            (
                id_sesion,
                id_servidor_publico,
                id_tipo_evaluacion,
                id_evaluador
            )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
    `;

        await pool.query(sqlInsert, [
            input.idSesion,
            input.idServidorPublico,
            input.tipoEvaluacionId,
            input.idEvaluador
        ]);

        const seguimiento = await this.obtenerSeguimiento(
            input.idSesion,
            input.tipoEvaluacionId,
            input.idServidorPublico,
            input.idEvaluador
        );

        if (!seguimiento) {
            throw new Error('No fue posible crear el seguimiento de evaluación.');
        }

        return seguimiento;
    },

    async obtenerSeguimiento(
        idSesion: string,
        tipoEvaluacionId: number,
        idServidorPublico: number,
        idEvaluador: number | null
    ): Promise<SeguimientoEvaluacion | null> {
        const sql = `
        SELECT ${SEGUIMIENTO_RETURNING}
        FROM sc_evaluacion_desempeno.tb_seguimiento_evaluacion
        WHERE id_sesion = $1
          AND id_tipo_evaluacion = $2
          AND id_servidor_publico = $3
          AND id_evaluador IS NOT DISTINCT FROM $4
        LIMIT 1
    `;

        const { rows } = await pool.query<SeguimientoEvaluacion>(sql, [
            idSesion,
            tipoEvaluacionId,
            idServidorPublico,
            idEvaluador
        ]);

        return rows[0] ?? null;
    },



    async actualizarOrdenSeguimiento(
        input: ActualizarOrdenSeguimientoInput
    ): Promise<SeguimientoEvaluacion | null> {

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Validar que las preguntas y respuestas pertenezcan
            //    a la evaluación y a la escala Likert.
            const sqlValidacion = `
            WITH preguntas_recibidas AS MATERIALIZED (
                SELECT
                    jsonb_array_elements_text($1::jsonb)::INTEGER AS id_pregunta
            ),
            preguntas_bd AS MATERIALIZED (
                SELECT p.id
                FROM sc_evaluacion_desempeno.tb_preguntas_evaluacion p
                WHERE p.id_evaluacion = $3
                FOR SHARE
            ),
            opciones_recibidas AS MATERIALIZED (
                SELECT
                    (item.value->>'preguntaId')::INTEGER AS id_pregunta,
                    respuesta.value::INTEGER AS id_respuesta
                FROM jsonb_array_elements($2::jsonb) AS item(value)
                CROSS JOIN LATERAL
                    jsonb_array_elements_text(item.value->'respuestaIds')
                    AS respuesta(value)
            ),
            preguntas_opciones AS (
                SELECT
                    (item.value->>'preguntaId')::INTEGER AS id_pregunta
                FROM jsonb_array_elements($2::jsonb) AS item(value)
            )
            SELECT
                (SELECT COUNT(*) FROM preguntas_bd)::INTEGER
                    AS total_preguntas_bd,

                (SELECT COUNT(*) FROM preguntas_recibidas)::INTEGER
                    AS total_preguntas_recibidas,

                (
                    SELECT COUNT(*)
                    FROM preguntas_recibidas pr
                    INNER JOIN preguntas_bd pb
                        ON pb.id = pr.id_pregunta
                )::INTEGER AS preguntas_validas,

                (
                    SELECT COUNT(*)
                    FROM preguntas_recibidas pr
                    LEFT JOIN preguntas_bd pb
                        ON pb.id = pr.id_pregunta
                    WHERE pb.id IS NULL
                )::INTEGER AS preguntas_invalidas,

                (
                    SELECT COUNT(*)
                    FROM opciones_recibidas o
                    LEFT JOIN sc_evaluacion_desempeno.tb_escalalikert e
                        ON e.id = o.id_respuesta
                    WHERE e.id IS NULL
                )::INTEGER AS respuestas_invalidas,

                (
                    SELECT COUNT(*)
                    FROM preguntas_opciones po
                    LEFT JOIN preguntas_recibidas pr
                        ON pr.id_pregunta = po.id_pregunta
                    WHERE pr.id_pregunta IS NULL
                )::INTEGER AS opciones_preguntas_invalidas,

                (
                    SELECT COUNT(DISTINCT po.id_pregunta)
                    FROM preguntas_opciones po
                )::INTEGER AS total_preguntas_con_opciones
        `;

            const valoresValidacion = [
                JSON.stringify(input.preguntasOrdenadas),
                JSON.stringify(input.opcionesOrdenadas),
                input.tipoEvaluacionId
            ];

            const { rows: validaciones } = await client.query(
                sqlValidacion,
                valoresValidacion
            );

            const validacion = validaciones[0];

            // 2. Comprobar que el formulario tenga las 15 preguntas.
            if (
                Number(validacion.total_preguntas_bd) !== 15 ||
                Number(validacion.total_preguntas_recibidas) !== 15 ||
                Number(validacion.preguntas_validas) !== 15 ||
                Number(validacion.preguntas_invalidas) !== 0
            ) {
                throw new Error(
                    'Las preguntas recibidas no corresponden al formulario completo de la evaluación.'
                );
            }

            // 3. Comprobar que todas las respuestas existan en la escala Likert.
            if (Number(validacion.respuestas_invalidas) > 0) {
                throw new Error(
                    'Se encontraron opciones de respuesta que no pertenecen a la escala Likert.'
                );
            }

            // 4. Comprobar que las opciones correspondan a las preguntas recibidas.
            if (
                Number(validacion.opciones_preguntas_invalidas) > 0 ||
                Number(validacion.total_preguntas_con_opciones) !== 15
            ) {
                throw new Error(
                    'La configuración de opciones no corresponde a todas las preguntas de la evaluación.'
                );
            }

            // 5. Actualizar únicamente un seguimiento que siga INICIADO.
            const sqlActualizacion = `
            UPDATE sc_evaluacion_desempeno.tb_seguimiento_evaluacion
            SET preguntas_ordenadas = $5::jsonb,
                opciones_ordenadas = $6::jsonb
            WHERE id_sesion = $1
              AND id_tipo_evaluacion = $2
              AND id_servidor_publico = $3
              AND id_evaluador IS NOT DISTINCT FROM $4
              AND estado = 'INICIADA'
            RETURNING ${SEGUIMIENTO_RETURNING}
        `;

            const valoresActualizacion = [
                input.idSesion,
                input.tipoEvaluacionId,
                input.idServidorPublico,
                input.idEvaluador,
                JSON.stringify(input.preguntasOrdenadas),
                JSON.stringify(input.opcionesOrdenadas)
            ];

            const { rows } = await client.query<SeguimientoEvaluacion>(
                sqlActualizacion,
                valoresActualizacion
            );

            await client.query('COMMIT');

            return rows[0] ?? null;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;

        } finally {
            client.release();
        }
    },



    async marcarSeguimientoEnProceso(
        idSesion: string,
        tipoEvaluacionId: number,
        idServidorPublico: number,
        idEvaluador: number | null,
        tiempoTotal = 1200
    ): Promise<SeguimientoEvaluacion | null> {
        return this.reanudarSeguimiento(
            idSesion,
            tipoEvaluacionId,
            idServidorPublico,
            idEvaluador,
            tiempoTotal
        );
    },

    async finalizarSeguimiento(
        idSesion: string,
        tipoEvaluacionId: number,
        idServidorPublico: number,
        idEvaluador: number | null,
        tiempoTotal = 1200
    ): Promise<SeguimientoEvaluacion | null> {

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const consulta = await client.query(`
            SELECT id, estado, tiempo_evaluacion
            FROM sc_evaluacion_desempeno.tb_seguimiento_evaluacion
            WHERE id_sesion = $1
              AND id_tipo_evaluacion = $2
              AND id_servidor_publico = $3
              AND id_evaluador IS NOT DISTINCT FROM $4
            FOR UPDATE
        `, [idSesion, tipoEvaluacionId, idServidorPublico, idEvaluador]);

            const seguimiento = consulta.rows[0];

            if (!seguimiento) {
                await client.query('COMMIT');
                return null;
            }

            if (seguimiento.estado === 'FINALIZADA') {
                await client.query('COMMIT');
                return this.obtenerSeguimiento(
                    idSesion,
                    tipoEvaluacionId,
                    idServidorPublico,
                    idEvaluador
                );
            }

            // La finalización manual solo está permitida mientras el
            // seguimiento se encuentra activo. INICIADA y PAUSADA no pueden
            // finalizarse mediante esta operación.
            if (seguimiento.estado !== 'EN PROCESO') {
                await client.query('COMMIT');
                return null;
            }

            let tiempoFinal = Number(seguimiento.tiempo_evaluacion ?? 0);

            if (seguimiento.estado === 'EN PROCESO') {
                const tiempoQuery = await client.query(`
                SELECT GREATEST(
                    0,
                    COALESCE(
                        FLOOR(EXTRACT(
                            EPOCH FROM (
                                clock_timestamp() - fecha_ultima_reanudacion
                            )
                        ))::INTEGER,
                        0
                    )
                ) AS segundos
                FROM sc_evaluacion_desempeno.tb_seguimiento_evaluacion
                WHERE id = $1
            `, [seguimiento.id]);

                tiempoFinal += Number(tiempoQuery.rows[0]?.segundos ?? 0);
            }

            tiempoFinal = Math.min(tiempoTotal, Math.max(0, tiempoFinal));

            await client.query(`
            UPDATE sc_evaluacion_desempeno.tb_seguimiento_evaluacion
            SET estado = 'FINALIZADA',
                tiempo_evaluacion = $2,
                fecha_ultima_reanudacion = NULL,
                fecha_finalizacion = clock_timestamp()
            WHERE id = $1
        `, [seguimiento.id, tiempoFinal]);

            await client.query('COMMIT');

            return this.obtenerSeguimiento(
                idSesion, tipoEvaluacionId, idServidorPublico, idEvaluador
            );

        } catch (error) {
            // Evita que un fallo del ROLLBACK oculte el error original.
            try {
                await client.query('ROLLBACK');
            } catch {
                // La conexión se libera en finally; se conserva el error original.
            }
            throw error;
        } finally {
            client.release();
        }
    },



    async reanudarSeguimiento(
        idSesion: string, tipoEvaluacionId: number, idServidorPublico: number, idEvaluador: number | null, tiempoTotal = 1200): Promise<SeguimientoEvaluacion | null> {

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const consulta = await client.query(`
            SELECT id, estado, tiempo_evaluacion,
                   fecha_ultima_reanudacion
            FROM sc_evaluacion_desempeno.tb_seguimiento_evaluacion
            WHERE id_sesion = $1
              AND id_tipo_evaluacion = $2
              AND id_servidor_publico = $3
              AND id_evaluador IS NOT DISTINCT FROM $4
            FOR UPDATE
        `, [idSesion, tipoEvaluacionId, idServidorPublico, idEvaluador]);

            const seguimiento = consulta.rows[0];

            if (!seguimiento) {
                await client.query('COMMIT');
                return null;
            }

            if (seguimiento.estado === 'FINALIZADA') {
                await client.query('COMMIT');
                return this.obtenerSeguimiento(
                    idSesion,
                    tipoEvaluacionId,
                    idServidorPublico,
                    idEvaluador
                );
            }

            let tiempoAcumulado = Number(seguimiento.tiempo_evaluacion ?? 0);

            if (seguimiento.estado === 'EN PROCESO' && !seguimiento.fecha_ultima_reanudacion) {
                await client.query(`
                    UPDATE sc_evaluacion_desempeno.tb_seguimiento_evaluacion
                    SET fecha_ultima_reanudacion = clock_timestamp()
                    WHERE id = $1
                `, [seguimiento.id]);
            }

            if (seguimiento.estado === 'EN PROCESO') {
                const tiempoActivo = await client.query(`
                SELECT GREATEST(
                    0,
                    FLOOR(EXTRACT(
                        EPOCH FROM (
                            clock_timestamp() - fecha_ultima_reanudacion
                        )
                    ))
                )::INTEGER AS segundos
                FROM sc_evaluacion_desempeno.tb_seguimiento_evaluacion
                WHERE id = $1
            `, [seguimiento.id]);

                tiempoAcumulado += Number(tiempoActivo.rows[0]?.segundos ?? 0);
            }

            if (tiempoAcumulado >= tiempoTotal) {
                await client.query(`
                UPDATE sc_evaluacion_desempeno.tb_seguimiento_evaluacion
                SET estado = 'FINALIZADA',
                    tiempo_evaluacion = $2,
                    fecha_ultima_reanudacion = NULL,
                    fecha_finalizacion = clock_timestamp()
                WHERE id = $1
            `, [seguimiento.id, tiempoTotal]);

            } else if (seguimiento.estado === 'PAUSADA') {
                await client.query(`
                UPDATE sc_evaluacion_desempeno.tb_seguimiento_evaluacion
                SET estado = 'EN PROCESO',
                    fecha_ultima_reanudacion = clock_timestamp()
                WHERE id = $1
            `, [seguimiento.id]);
            }

            await client.query('COMMIT');

            return this.obtenerSeguimiento(
                idSesion, tipoEvaluacionId, idServidorPublico, idEvaluador
            );

        } catch (error) {
            // Evita que un fallo del ROLLBACK oculte el error original.
            try {
                await client.query('ROLLBACK');
            } catch {
                // La conexión se libera en finally; se conserva el error original.
            }
            throw error;
        } finally {
            client.release();
        }
    },


    async pausarSeguimiento(
        idSesion: string,
        tipoEvaluacionId: number,
        idServidorPublico: number,
        idEvaluador: number | null,
        tiempoTotal = 1200
    ): Promise<SeguimientoEvaluacion | null> {

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const consulta = await client.query(`
            SELECT id, estado, tiempo_evaluacion
            FROM sc_evaluacion_desempeno.tb_seguimiento_evaluacion
            WHERE id_sesion = $1
              AND id_tipo_evaluacion = $2
              AND id_servidor_publico = $3
              AND id_evaluador IS NOT DISTINCT FROM $4
            FOR UPDATE
        `, [idSesion, tipoEvaluacionId, idServidorPublico, idEvaluador]);

            const seguimiento = consulta.rows[0];

            if (!seguimiento) {
                await client.query('COMMIT');
                return null;
            }

            // Antes de la primera respuesta no existe un contador que pausar.
            // Se conserva INICIADA y los 20 minutos completos disponibles.
            if (seguimiento.estado === 'INICIADA') {
                await client.query('COMMIT');
                return this.obtenerSeguimiento(
                    idSesion, tipoEvaluacionId, idServidorPublico, idEvaluador
                );
            }

            // Si ya está pausada o finalizada, no modificar el tiempo acumulado.
            if (seguimiento.estado !== 'EN PROCESO') {
                await client.query('COMMIT');
                return this.obtenerSeguimiento(
                    idSesion, tipoEvaluacionId, idServidorPublico, idEvaluador
                );
            }

            const tiempoQuery = await client.query(`
            SELECT LEAST(
                $2,
                GREATEST(
                    0,
                    COALESCE(tiempo_evaluacion, 0) +
                    GREATEST(
                        0,
                        COALESCE(
                            FLOOR(EXTRACT(
                                EPOCH FROM (
                                    clock_timestamp() - fecha_ultima_reanudacion
                                )
                            ))::INTEGER,
                            0
                        )
                    )
                )
            )::INTEGER AS segundos
            FROM sc_evaluacion_desempeno.tb_seguimiento_evaluacion
            WHERE id = $1
        `, [seguimiento.id, tiempoTotal]);

            const tiempoAcumulado = Number(tiempoQuery.rows[0].segundos);

            if (tiempoAcumulado >= tiempoTotal) {
                await client.query(`
                UPDATE sc_evaluacion_desempeno.tb_seguimiento_evaluacion
                SET estado = 'FINALIZADA',
                    tiempo_evaluacion = $2,
                    fecha_ultima_reanudacion = NULL,
                    fecha_finalizacion = clock_timestamp()
                WHERE id = $1
            `, [seguimiento.id, tiempoTotal]);
            } else {
                await client.query(`
                UPDATE sc_evaluacion_desempeno.tb_seguimiento_evaluacion
                SET estado = 'PAUSADA',
                    tiempo_evaluacion = $2,
                    fecha_ultima_reanudacion = NULL
                WHERE id = $1
            `, [seguimiento.id, tiempoAcumulado]);
            }

            await client.query('COMMIT');

            return this.obtenerSeguimiento(
                idSesion, tipoEvaluacionId, idServidorPublico, idEvaluador
            );

        } catch (error) {
            // Evita que un fallo del ROLLBACK oculte el error original.
            try {
                await client.query('ROLLBACK');
            } catch {
                // La conexión se libera en finally; se conserva el error original.
            }
            throw error;
        } finally {
            client.release();
        }
    },




    async obtenerTemporizador(
        idSesion: string, tipoEvaluacionId: number, idServidorPublico: number, idEvaluador: number | null, tiempoTotal: number): Promise<TemporizadorEvaluacion | null> {

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const consulta = await client.query(`
                SELECT
                    id,
                    estado,
                    TO_CHAR(fecha_inicio, 'YYYY-MM-DD HH24:MI:SS') AS fecha_inicio,
                    TO_CHAR(
                        fecha_ultima_reanudacion,
                        'YYYY-MM-DD HH24:MI:SS'
                    ) AS fecha_ultima_reanudacion,
                    TO_CHAR(
                        fecha_finalizacion,
                        'YYYY-MM-DD HH24:MI:SS'
                    ) AS fecha_finalizacion,
                    COALESCE(tiempo_evaluacion, 0)::INTEGER AS acumulado,
                    CASE
                        WHEN estado = 'EN PROCESO'
                             AND fecha_ultima_reanudacion IS NOT NULL
                        THEN GREATEST(
                            0,
                            COALESCE(
                                FLOOR(EXTRACT(
                                    EPOCH FROM (
                                        clock_timestamp() - fecha_ultima_reanudacion
                                    )
                                ))::INTEGER,
                                0
                            )
                        )
                        ELSE 0
                    END AS tiempo_activo
                FROM sc_evaluacion_desempeno.tb_seguimiento_evaluacion
                WHERE id_sesion = $1
                  AND id_tipo_evaluacion = $2
                  AND id_servidor_publico = $3
                  AND id_evaluador IS NOT DISTINCT FROM $4
                FOR UPDATE
            `, [idSesion, tipoEvaluacionId, idServidorPublico, idEvaluador]);

            const seguimiento = consulta.rows[0];

            if (!seguimiento) {
                await client.query('COMMIT');
                return null;
            }

            let tiempoTranscurrido = Math.min(
                tiempoTotal,
                Math.max(0,
                    Number(seguimiento.acumulado ?? 0) +
                    Number(seguimiento.tiempo_activo ?? 0)
                )
            );

            let estado = seguimiento.estado;
            let fechaFinalizacion = seguimiento.fecha_finalizacion;

            if (estado !== 'FINALIZADA' && tiempoTranscurrido >= tiempoTotal) {
                tiempoTranscurrido = tiempoTotal;
                estado = 'FINALIZADA';

                const finalizacion = await client.query(`
                    UPDATE sc_evaluacion_desempeno.tb_seguimiento_evaluacion
                    SET estado = 'FINALIZADA',
                        tiempo_evaluacion = $2,
                        fecha_ultima_reanudacion = NULL,
                        fecha_finalizacion = clock_timestamp()
                    WHERE id = $1
                    RETURNING TO_CHAR(
                        fecha_finalizacion,
                        'YYYY-MM-DD HH24:MI:SS'
                    ) AS fecha_finalizacion
                `, [seguimiento.id, tiempoTotal]);

                fechaFinalizacion = finalizacion.rows[0]?.fecha_finalizacion ?? null;
            }

            await client.query('COMMIT');

            return {
                tiempoTotal,
                tiempoTranscurrido,
                tiempoRestante: Math.max(0, tiempoTotal - tiempoTranscurrido),
                estado,
                fechaInicio: seguimiento.fecha_inicio ?? '',
                fechaUltimaReanudacion: seguimiento.fecha_ultima_reanudacion ?? null,
                fechaFinalizacion: fechaFinalizacion ?? null
            };

        } catch (error) {
            // Evita que un fallo del ROLLBACK oculte el error original.
            try {
                await client.query('ROLLBACK');
            } catch {
                // La conexión se libera en finally; se conserva el error original.
            }
            throw error;
        } finally {
            client.release();
        }
    },


    async guardarRespuestaControlada(
        input: GuardarEvaluacionInput,
        tiempoTotal: number
    ): Promise<ResultadoOperacionEvaluacion> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Bloquear el seguimiento serializa las escrituras de sus respuestas.
            // Así se evita depender de índices únicos parciales para el UPSERT.
            const seguimientoQuery = await client.query(`
                SELECT
                    id,
                    estado,
                    COALESCE(tiempo_evaluacion, 0)::INTEGER AS acumulado,
                    CASE
                        WHEN estado = 'EN PROCESO'
                             AND fecha_ultima_reanudacion IS NOT NULL
                        THEN GREATEST(
                            0,
                            COALESCE(
                                FLOOR(EXTRACT(
                                    EPOCH FROM (
                                        clock_timestamp() - fecha_ultima_reanudacion
                                    )
                                ))::INTEGER,
                                0
                            )
                        )
                        ELSE 0
                    END AS tiempo_activo
                FROM sc_evaluacion_desempeno.tb_seguimiento_evaluacion
                WHERE id_sesion = $1
                  AND id_tipo_evaluacion = $2
                  AND id_servidor_publico = $3
                  AND id_evaluador IS NOT DISTINCT FROM $4
                FOR UPDATE
            `, [
                input.idSesion,
                input.tipoEvaluacionId,
                input.idServidorPublico,
                input.idEvaluador
            ]);

            const seguimiento = seguimientoQuery.rows[0];

            if (!seguimiento) {
                await client.query('ROLLBACK');
                return { estado: 'NO_ENCONTRADA', resultado: null };
            }

            if (seguimiento.estado === 'FINALIZADA') {
                await client.query('ROLLBACK');
                return { estado: 'FINALIZADA', resultado: null };
            }

            if (
                seguimiento.estado !== 'INICIADA' &&
                seguimiento.estado !== 'EN PROCESO'
            ) {
                await client.query('ROLLBACK');
                return { estado: 'PAUSADA', resultado: null };
            }

            const tiempoTranscurrido =
                Number(seguimiento.acumulado ?? 0) +
                Number(seguimiento.tiempo_activo ?? 0);

            if (
                seguimiento.estado === 'EN PROCESO' &&
                tiempoTranscurrido >= tiempoTotal
            ) {
                await client.query(`
                    UPDATE sc_evaluacion_desempeno.tb_seguimiento_evaluacion
                    SET estado = 'FINALIZADA',
                        tiempo_evaluacion = $2,
                        fecha_ultima_reanudacion = NULL,
                        fecha_finalizacion = clock_timestamp()
                    WHERE id = $1
                `, [seguimiento.id, tiempoTotal]);

                await client.query('COMMIT');
                return { estado: 'VENCIDA', resultado: null };
            }

            // Buscar la respuesta de esta pregunta dentro del seguimiento.
            // El bloqueo previo del seguimiento impide que dos peticiones
            // simultáneas creen dos respuestas para la misma pregunta.
            const existenteQuery = await client.query(`
                SELECT id
                FROM sc_evaluacion_desempeno.tb_resultados_evaluacion
                WHERE id_sesion = $1
                  AND id_tipo_evaluacion = $2
                  AND id_servidor_publico = $3
                  AND id_pregunta = $4
                  AND id_evaluador IS NOT DISTINCT FROM $5
                ORDER BY id
                LIMIT 1
                FOR UPDATE
            `, [
                input.idSesion,
                input.tipoEvaluacionId,
                input.idServidorPublico,
                input.preguntaId,
                input.idEvaluador
            ]);

            const existente = existenteQuery.rows[0];

            const resultadoQuery = existente
                ? await client.query(`
                    UPDATE sc_evaluacion_desempeno.tb_resultados_evaluacion
                    SET id_respuesta = $2,
                        puntaje = $3,
                        id_institucion = $4
                    WHERE id = $1
                    RETURNING
                        id::text AS "id",
                        id_sesion::text AS "idSesion",
                        id_tipo_evaluacion AS "tipoEvaluacionId",
                        id_pregunta AS "preguntaId",
                        id_respuesta AS "respuestaId",
                        puntaje,
                        id_servidor_publico AS "idServidorPublico",
                        id_evaluador AS "idEvaluador",
                        id_institucion AS "idInstitucion"
                `, [
                    existente.id,
                    input.respuestaId,
                    input.puntaje,
                    input.idInstitucion
                ])
                : await client.query(`
                    INSERT INTO sc_evaluacion_desempeno.tb_resultados_evaluacion
                    (
                        id_sesion,
                        id_tipo_evaluacion,
                        id_pregunta,
                        id_respuesta,
                        puntaje,
                        id_servidor_publico,
                        id_evaluador,
                        id_institucion
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING
                        id::text AS "id",
                        id_sesion::text AS "idSesion",
                        id_tipo_evaluacion AS "tipoEvaluacionId",
                        id_pregunta AS "preguntaId",
                        id_respuesta AS "respuestaId",
                        puntaje,
                        id_servidor_publico AS "idServidorPublico",
                        id_evaluador AS "idEvaluador",
                        id_institucion AS "idInstitucion"
                `, [
                    input.idSesion,
                    input.tipoEvaluacionId,
                    input.preguntaId,
                    input.respuestaId,
                    input.puntaje,
                    input.idServidorPublico,
                    input.idEvaluador,
                    input.idInstitucion
                ]);

            if (!resultadoQuery.rows[0]) {
                throw new Error('No se pudo guardar la respuesta de evaluación.');
            }

            // La primera respuesta guardada inicia el cronómetro en PostgreSQL.
            // Ambas operaciones pertenecen a la misma transacción.
            if (seguimiento.estado === 'INICIADA') {
                await client.query(`
                    UPDATE sc_evaluacion_desempeno.tb_seguimiento_evaluacion
                    SET estado = 'EN PROCESO',
                        fecha_ultima_reanudacion = clock_timestamp()
                    WHERE id = $1
                      AND estado = 'INICIADA'
                `, [seguimiento.id]);
            }

            await client.query('COMMIT');

            return {
                estado: existente ? 'ACTUALIZADA' : 'GUARDADA',
                resultado: resultadoQuery.rows[0]
            };

        } catch (error) {
            try {
                await client.query('ROLLBACK');
            } catch {
                // Se conserva el error original.
            }
            throw error;
        } finally {
            client.release();
        }
    },


    async obtenerPropietarioRespuesta(id: string): Promise<{
        tipoEvaluacionId: number;
        idServidorPublico: number;
        idEvaluador: number | null;
        idInstitucion: number;
    } | null> {
        const resultado = await pool.query(`
            SELECT
                id_tipo_evaluacion AS "tipoEvaluacionId",
                id_servidor_publico AS "idServidorPublico",
                id_evaluador AS "idEvaluador",
                id_institucion AS "idInstitucion"
            FROM sc_evaluacion_desempeno.tb_resultados_evaluacion
            WHERE id = $1
            LIMIT 1
        `, [id]);

        return resultado.rows[0] ?? null;
    },

    async actualizarRespuestaControlada(
        id: string,
        input: ActualizarEvaluacionInput,
        tiempoTotal: number,
        propietario: {
            tipoEvaluacionId: number;
            idServidorPublico: number;
            idEvaluador: number | null;
            idInstitucion: number;
        }
    ): Promise<ResultadoOperacionEvaluacion> {

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const seguimientoQuery = await client.query(`
                SELECT
                    t.id AS seguimiento_id,
                    t.estado,
                    COALESCE(t.tiempo_evaluacion, 0)::INTEGER AS acumulado,
                    CASE
                        WHEN t.estado = 'EN PROCESO'
                             AND t.fecha_ultima_reanudacion IS NOT NULL
                        THEN GREATEST(
                            0,
                            COALESCE(
                                FLOOR(EXTRACT(
                                    EPOCH FROM (
                                        clock_timestamp() - t.fecha_ultima_reanudacion
                                    )
                                ))::INTEGER,
                                0
                            )
                        )
                        ELSE 0
                    END AS tiempo_activo
                FROM sc_evaluacion_desempeno.tb_resultados_evaluacion r
                INNER JOIN sc_evaluacion_desempeno.tb_seguimiento_evaluacion t
                    ON t.id_sesion = r.id_sesion
                   AND t.id_tipo_evaluacion = r.id_tipo_evaluacion
                   AND t.id_servidor_publico = r.id_servidor_publico
                   AND t.id_evaluador IS NOT DISTINCT FROM r.id_evaluador
                WHERE r.id = $1
                  AND r.id_tipo_evaluacion = $2
                  AND r.id_servidor_publico = $3
                  AND r.id_evaluador IS NOT DISTINCT FROM $4
                  AND r.id_institucion = $5
                FOR UPDATE OF r, t
            `, [
                id,
                propietario.tipoEvaluacionId,
                propietario.idServidorPublico,
                propietario.idEvaluador,
                propietario.idInstitucion,
            ]);

            const seguimiento = seguimientoQuery.rows[0];

            if (!seguimiento) {
                await client.query('ROLLBACK');
                return {
                    estado: 'NO_ENCONTRADA',
                    resultado: null
                };
            }

            // Una evaluación pausada no admite nuevas modificaciones.
            // El tiempo queda conservado hasta que el seguimiento se reanude.
            if (seguimiento.estado === 'PAUSADA') {
                await client.query('ROLLBACK');
                return {
                    estado: 'PAUSADA',
                    resultado: null
                };
            }

            // Una evaluación finalizada es inmutable.
            if (seguimiento.estado === 'FINALIZADA') {
                await client.query('ROLLBACK');
                return {
                    estado: 'FINALIZADA',
                    resultado: null
                };
            }

            // El límite de tiempo solo se evalúa mientras el cronómetro
            // está activo. En INICIADA y PAUSADA no se consume tiempo.
            if (seguimiento.estado === 'EN PROCESO') {
                const tiempoTranscurrido =
                    Number(seguimiento.acumulado ?? 0) +
                    Number(seguimiento.tiempo_activo ?? 0);

                if (tiempoTranscurrido >= tiempoTotal) {
                    await client.query(`
                    UPDATE sc_evaluacion_desempeno.tb_seguimiento_evaluacion
                    SET estado = 'FINALIZADA',
                        tiempo_evaluacion = $2,
                        fecha_ultima_reanudacion = NULL,
                        fecha_finalizacion = clock_timestamp()
                    WHERE id = $1
                `, [
                        seguimiento.seguimiento_id,
                        tiempoTotal
                    ]);

                    await client.query('COMMIT');

                    return {
                        estado: 'VENCIDA',
                        resultado: null
                    };
                }
            }

            const resultadoQuery = await client.query(`
                UPDATE sc_evaluacion_desempeno.tb_resultados_evaluacion
                SET id_respuesta = $2,
                    puntaje = $3
                WHERE id = $1
                RETURNING
                    id::text AS "id",
                    id_sesion::text AS "idSesion",
                    id_tipo_evaluacion AS "tipoEvaluacionId",
                    id_pregunta AS "preguntaId",
                    id_respuesta AS "respuestaId",
                    puntaje,
                    id_servidor_publico AS "idServidorPublico",
                    id_evaluador AS "idEvaluador",
                    id_institucion AS "idInstitucion"
            `, [id, input.respuestaId, input.puntaje]);

            if (!resultadoQuery.rows[0]) {
                await client.query('ROLLBACK');
                return {
                    estado: 'NO_ENCONTRADA',
                    resultado: null
                };
            }

            await client.query('COMMIT');

            return {
                estado: 'ACTUALIZADA',
                resultado: resultadoQuery.rows[0]
            };

        } catch (error) {
            // Evita que un fallo del ROLLBACK oculte el error original.
            try {
                await client.query('ROLLBACK');
            } catch {
                // La conexión se libera en finally; se conserva el error original.
            }
            throw error;
        } finally {
            client.release();
        }
    },


    async obtenerServidorPorToken(
        token: string
    ): Promise<ServidorPublicoPorToken | null> {

        const sql = `
        SELECT
            id_servidor_publico AS "idServidorPublico",
            id_institucion AS "idInstitucion",
            institucion,
            dni,
            nombre,
            cargo,
            area,
            correo,
            tipo_link AS "idEnlace",
            id_evaluador AS "idEvaluador",
            linked
        FROM sc_evaluacion_desempeno.tb_linked_evaluacion
        WHERE token = $1
        LIMIT 1
    `;

        const { rows } = await pool.query<ServidorPublicoPorToken>(
            sql,
            [token]
        );

        return rows[0] ?? null;
    },


    async obtenerSubalternos(
        idEvaluador: number
    ): Promise<SubalternoEvaluacion[]> {

        const sql = `
        SELECT
            l.id_servidor_publico AS "idServidorPublico",
            l.id_institucion AS "idInstitucion",
            l.institucion,
            l.dni,
            l.nombre,
            l.cargo,
            l.area,
            l.correo,
            l.tipo_link AS "idEnlace",
            l.id_evaluador AS "idEvaluador",
            CASE
                WHEN seguimiento.estado = 'FINALIZADA'
                    THEN 'EVALUADO'
                ELSE 'PENDIENTE'
            END AS "estadoEvaluacion"
        FROM sc_evaluacion_desempeno.tb_linked_evaluacion l
        LEFT JOIN LATERAL (
            SELECT se.estado
            FROM sc_evaluacion_desempeno.tb_seguimiento_evaluacion se
            WHERE se.id_servidor_publico = l.id_servidor_publico
              AND se.id_tipo_evaluacion = 2
              AND se.id_evaluador = l.id_evaluador
              AND se.estado = 'FINALIZADA'
              AND EXISTS (
                  SELECT 1
                  FROM sc_evaluacion_desempeno.tb_resultados_evaluacion re
                  WHERE re.id_sesion = se.id_sesion
                    AND re.id_tipo_evaluacion = se.id_tipo_evaluacion
                    AND re.id_servidor_publico = se.id_servidor_publico
                    AND re.id_evaluador = l.id_evaluador
              )
            ORDER BY se.fecha_finalizacion DESC NULLS LAST
            LIMIT 1
        ) seguimiento ON TRUE

        WHERE l.id_evaluador = $1
        ORDER BY l.nombre
    `;

        const { rows } = await pool.query<SubalternoEvaluacion>(
            sql,
            [idEvaluador]
        );

        return rows;
    },


    async esSubalternoAutorizado(
        idEvaluador: number,
        idServidorPublico: number,
    ): Promise<boolean> {
        const sql = `
        SELECT EXISTS (
            SELECT 1
            FROM sc_evaluacion_desempeno.tb_linked_evaluacion evaluador
            INNER JOIN sc_evaluacion_desempeno.tb_linked_evaluacion subalterno
                ON subalterno.id_servidor_publico = $2
               AND subalterno.id_evaluador = $1
               AND subalterno.id_institucion = evaluador.id_institucion
            WHERE evaluador.id_servidor_publico = $1
        ) AS autorizado
    `;

        const { rows } = await pool.query<{ autorizado: boolean }>(
            sql,
            [idEvaluador, idServidorPublico],
        );

        return rows[0]?.autorizado === true;
    },


};



