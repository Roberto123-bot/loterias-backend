const express = require("express");
const router = express.Router();
const {
  atualizarLoteria,
  atualizarTodasLoterias,
  buscarConcursoCaixa,
  LOTERIAS_CONFIG,
} = require("../services/atualizadorLoterias.js");

// Middleware de autenticação (opcional - descomente se quiser proteger)
// const { verificarToken } = require('../middleware/auth');
// router.use(verificarToken);

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

/**
 * GET /api/atualizar/:loteria
 * Atualizar loteria específica
 */
router.get("/:loteria", async (req, res) => {
  try {
    const { loteria } = req.params;

    // Validar loteria
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

module.exports = router;
