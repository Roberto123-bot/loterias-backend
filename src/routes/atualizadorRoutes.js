const express = require("express");
const router = express.Router();
const { executarAtualizacaoManual } = require("../services/agendador.js");
const {
  atualizarLoteria,
  atualizarTodasLoterias,
  buscarConcursoCaixa,
  LOTERIAS_CONFIG,
} = require("../services/atualizadorLoterias.js");

/**
 * GET /api/atualizar/forcar
 * Forçar atualização manual pelo navegador
 */
router.get("/forcar", async (req, res) => {
  const secret = req.query.secret;

  console.log("🔐 Secret recebida?", !!secret);
  console.log("🔐 Bate com env?", secret === process.env.CRON_SECRET);

  if (secret !== process.env.CRON_SECRET) {
    return res.status(403).json({
      success: false,
      message: "Acesso não autorizado",
    });
  }

  console.log("🔥 ROTA /forcar CHAMADA");

  const resultado = await executarAtualizacaoManual("rota-manual");

  if (resultado.success) {
    return res.json({
      success: true,
      message: resultado.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: resultado.message,
  });
});

/**
 * GET /api/atualizar/status/loterias
 * Ver status de todas as loterias (último concurso no banco)
 */
router.get("/status/loterias", async (req, res) => {
  try {
    const pool = require("../config/database");
    const status = {};

    for (const [id, config] of Object.entries(LOTERIAS_CONFIG)) {
      const result = await pool.query(
        `SELECT MAX(concurso) as ultimo, COUNT(*) as total FROM ${config.tabela}`
      );

      status[id] = {
        nome: config.nome,
        ultimoConcurso: result.rows[0].ultimo,
        totalConcursos: parseInt(result.rows[0].total),
      };
    }

    res.json({
      success: true,
      data: status,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao buscar status",
      error: error.message,
    });
  }
});

/**
 * GET /api/atualizar/testar/:loteria/:concurso
 * Testar busca de um concurso específico (para debug)
 */
router.get("/testar/:loteria/:concurso", async (req, res) => {
  try {
    const { loteria, concurso } = req.params;

    if (!LOTERIAS_CONFIG[loteria]) {
      return res.status(400).json({
        success: false,
        message: "Loteria inválida",
      });
    }

    const dados = await buscarConcursoCaixa(loteria, concurso);

    if (!dados) {
      return res.status(404).json({
        success: false,
        message: "Concurso não encontrado na API da Caixa",
      });
    }

    res.json({
      success: true,
      data: dados,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao buscar concurso",
      error: error.message,
    });
  }
});

/**
 * GET /api/atualizar/:loteria
 * Atualizar loteria específica
 */
router.get("/:loteria", async (req, res) => {
  console.log("⚠️ ROTA /:loteria CHAMADA:", req.params.loteria);
  try {
    const { loteria } = req.params;

    if (!LOTERIAS_CONFIG[loteria]) {
      return res.status(400).json({
        success: false,
        message: "Loteria inválida",
        loteriasDisponiveis: Object.keys(LOTERIAS_CONFIG),
      });
    }

    const resultado = await atualizarLoteria(loteria);

    res.json({
      success: true,
      message: "Atualização concluída",
      data: resultado,
    });
  } catch (error) {
    console.error(`Erro ao atualizar ${req.params.loteria}:`, error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar loteria",
      error: error.message,
    });
  }
});

/**
 * GET /api/atualizar
 * Atualizar todas as loterias
 */
router.get("/", async (req, res) => {
  try {
    const resultado = await atualizarTodasLoterias();

    res.json({
      success: true,
      message: "Atualização concluída",
      data: resultado,
    });
  } catch (error) {
    console.error("Erro ao atualizar loterias:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar loterias",
      error: error.message,
    });
  }
});

module.exports = router;
