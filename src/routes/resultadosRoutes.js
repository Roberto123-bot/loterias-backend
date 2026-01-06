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
  (SELECT 'megasena' AS loteria, concurso, dezenas, NULL::int[] AS dezenas_2, NULL::int[] AS trevos, NULL::text AS mes_sorte, NULL::text AS time_coracao FROM megasena ORDER BY concurso DESC LIMIT 1)
  UNION ALL
  (SELECT 'lotofacil', concurso, dezenas, NULL, NULL, mes_sorte, NULL FROM lotofacil ORDER BY concurso DESC LIMIT 1)
  UNION ALL
  (SELECT 'quina', concurso, dezenas, NULL, NULL, NULL, NULL FROM quina ORDER BY concurso DESC LIMIT 1)
  UNION ALL
  (SELECT 'lotomania', concurso, dezenas, NULL, NULL, NULL, NULL FROM lotomania ORDER BY concurso DESC LIMIT 1)
  UNION ALL
  (SELECT 'duplasena', concurso, dezenas_1 AS dezenas, dezenas_2, NULL, NULL, NULL FROM duplasena ORDER BY concurso DESC LIMIT 1)
  UNION ALL
  (SELECT 'timemania', concurso, dezenas, NULL, NULL, NULL, time_coracao FROM timemania ORDER BY concurso DESC LIMIT 1)
  UNION ALL
  (SELECT 'diadasorte', concurso, dezenas, NULL, NULL, mes_sorte, NULL FROM diadasorte ORDER BY concurso DESC LIMIT 1)
  UNION ALL
  (SELECT 'maismilionaria', concurso, dezenas, NULL, trevos, NULL, NULL FROM maismilionaria ORDER BY concurso DESC LIMIT 1)
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
