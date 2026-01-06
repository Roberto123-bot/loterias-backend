const express = require("express");
const router = express.Router();
const pool = require("../config/database");

// Cache em memória (5 minutos)
let cache = null;
let cacheTime = null;
const CACHE_TTL = 5 * 60 * 1000;

router.get("/ultimos-todos", async (req, res) => {
  try {
    const agora = Date.now();

    // Usar cache se válido
    if (cache && cacheTime && agora - cacheTime < CACHE_TTL) {
      return res.json({
        success: true,
        data: cache,
        cached: true,
      });
    }

    const query = `
      SELECT *
      FROM (
        SELECT
          'megasena' AS loteria,
          concurso,
          dezenas,
          NULL::int[]  AS dezenas_2,
          NULL::int[]  AS trevos,
          NULL::text   AS mes_sorte,
          NULL::text   AS time_coracao
        FROM megasena
        ORDER BY concurso DESC
        LIMIT 1
      ) t1

      UNION ALL

      SELECT *
      FROM (
        SELECT
          'lotofacil',
          concurso,
          dezenas,
          NULL::int[],
          NULL::int[],
          mes_sorte,
          NULL::text
        FROM lotofacil
        ORDER BY concurso DESC
        LIMIT 1
      ) t2

      UNION ALL

      SELECT *
      FROM (
        SELECT
          'quina',
          concurso,
          dezenas,
          NULL::int[],
          NULL::int[],
          NULL::text,
          NULL::text
        FROM quina
        ORDER BY concurso DESC
        LIMIT 1
      ) t3

      UNION ALL

      SELECT *
      FROM (
        SELECT
          'lotomania',
          concurso,
          dezenas,
          NULL::int[],
          NULL::int[],
          NULL::text,
          NULL::text
        FROM lotomania
        ORDER BY concurso DESC
        LIMIT 1
      ) t4

      UNION ALL

      SELECT *
      FROM (
        SELECT
          'duplasena',
          concurso,
          dezenas_1 AS dezenas,
          dezenas_2,
          NULL::int[],
          NULL::text,
          NULL::text
        FROM duplasena
        ORDER BY concurso DESC
        LIMIT 1
      ) t5

      UNION ALL

      SELECT *
      FROM (
        SELECT
          'timemania',
          concurso,
          dezenas,
          NULL::int[],
          NULL::int[],
          NULL::text,
          time_coracao
        FROM timemania
        ORDER BY concurso DESC
        LIMIT 1
      ) t6

      UNION ALL

      SELECT *
      FROM (
        SELECT
          'diadasorte',
          concurso,
          dezenas,
          NULL::int[],
          NULL::int[],
          mes_sorte,
          NULL::text
        FROM diadasorte
        ORDER BY concurso DESC
        LIMIT 1
      ) t7

      UNION ALL

      SELECT *
      FROM (
        SELECT
          'maismilionaria',
          concurso,
          dezenas,
          NULL::int[],
          trevos,
          NULL::text,
          NULL::text
        FROM maismilionaria
        ORDER BY concurso DESC
        LIMIT 1
      ) t8
    `;

    const result = await pool.query(query);

    // Organizar por loteria
    const resultados = {};
    result.rows.forEach((row) => {
      resultados[row.loteria] = row;
    });

    // Salvar cache
    cache = resultados;
    cacheTime = agora;

    res.json({
      success: true,
      data: resultados,
      cached: false,
    });
  } catch (error) {
    console.error("Erro:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
