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

    // Buscar do banco (query otimizada)
    const query = `
(
  SELECT 'megasena' AS loteria,
         concurso,
         data_sorteio,
         dezenas,
         acumulou,
         valor_acumulado
  FROM megasena
  ORDER BY concurso DESC
  LIMIT 1
)
UNION ALL
(
  SELECT 'lotofacil',
         concurso,
         data_sorteio,
         dezenas,
         acumulou,
         valor_acumulado
  FROM lotofacil
  ORDER BY concurso DESC
  LIMIT 1
)
UNION ALL
(
  SELECT 'quina',
         concurso,
         data_sorteio,
         dezenas,
         acumulou,
         valor_acumulado
  FROM quina
  ORDER BY concurso DESC
  LIMIT 1
)
UNION ALL
(
  SELECT 'lotomania',
         concurso,
         data_sorteio,
         dezenas,
         acumulou,
         valor_acumulado
  FROM lotomania
  ORDER BY concurso DESC
  LIMIT 1
)
UNION ALL
(
  SELECT 'duplasena',
         concurso,
         data_sorteio,
         dezenas_sorteio1 AS dezenas,
         acumulou,
         valor_acumulado
  FROM duplasena
  ORDER BY concurso DESC
  LIMIT 1
)
UNION ALL
(
  SELECT 'timemania',
         concurso,
         data_sorteio,
         dezenas,
         acumulou,
         valor_acumulado
  FROM timemania
  ORDER BY concurso DESC
  LIMIT 1
)
UNION ALL
(
  SELECT 'diadasorte',
         concurso,
         data_sorteio,
         dezenas,
         acumulou,
         valor_acumulado
  FROM diadasorte
  ORDER BY concurso DESC
  LIMIT 1
)
UNION ALL
(
  SELECT 'maismilionaria',
         concurso,
         data_sorteio,
         dezenas,
         acumulou,
         valor_acumulado
  FROM maismilionaria
  ORDER BY concurso DESC
  LIMIT 1
)
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
