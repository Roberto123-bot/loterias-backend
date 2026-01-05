const express = require("express");
const router = express.Router();
const { verificarToken } = require("../middlewares/auth");
const pool = require("../config/database");

/**
 * GET /api/planos/meu-plano
 * Ver plano atual do usuário
 */
router.get("/meu-plano", verificarToken, async (req, res) => {
  try {
    const { id } = req.usuario;

    const result = await pool.query(
      "SELECT plano, plano_expira_em FROM usuarios WHERE id = $1",
      [id]
    );

    const usuario = result.rows[0];

    res.json({
      success: true,
      data: {
        plano: usuario.plano,
        expiraEm: usuario.plano_expira_em,
        recursos: getRecursosPorPlano(usuario.plano),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar plano:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar plano",
    });
  }
});

/**
 * POST /api/planos/upgrade
 * Fazer upgrade para PRÓ (depois integrar com pagamento)
 */
router.post("/upgrade", verificarToken, async (req, res) => {
  try {
    const { id } = req.usuario;
    const { duracao = 30 } = req.body; // dias

    // Calcular data de expiração
    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + duracao);

    // Atualizar plano
    await pool.query(
      "UPDATE usuarios SET plano = $1, plano_expira_em = $2 WHERE id = $3",
      ["pro", expiraEm, id]
    );

    // Registrar histórico
    await pool.query(
      "INSERT INTO historico_planos (usuario_id, plano_anterior, plano_novo, motivo) VALUES ($1, $2, $3, $4)",
      [id, "free", "pro", "upgrade"]
    );

    res.json({
      success: true,
      message: "Upgrade realizado com sucesso!",
      data: {
        plano: "pro",
        expiraEm: expiraEm,
      },
    });
  } catch (error) {
    console.error("Erro ao fazer upgrade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao fazer upgrade",
    });
  }
});

/**
 * POST /api/planos/downgrade
 * Voltar para FREE
 */
router.post("/downgrade", verificarToken, async (req, res) => {
  try {
    const { id } = req.usuario;

    await pool.query(
      "UPDATE usuarios SET plano = $1, plano_expira_em = NULL WHERE id = $2",
      ["free", id]
    );

    // Registrar histórico
    await pool.query(
      "INSERT INTO historico_planos (usuario_id, plano_anterior, plano_novo, motivo) VALUES ($1, $2, $3, $4)",
      [id, "pro", "free", "downgrade"]
    );

    res.json({
      success: true,
      message: "Plano alterado para FREE",
    });
  } catch (error) {
    console.error("Erro ao fazer downgrade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao fazer downgrade",
    });
  }
});

/**
 * GET /api/planos/recursos
 * Listar recursos de cada plano
 */
router.get("/recursos", (req, res) => {
  res.json({
    success: true,
    data: {
      free: getRecursosPorPlano("free"),
      pro: getRecursosPorPlano("pro"),
    },
  });
});

// Função auxiliar - recursos por plano
function getRecursosPorPlano(plano) {
  const recursos = {
    free: {
      verResultados: true,
      conferirJogos: false,
      mapaDezenas: false,
      verDetalhes: false,
      limite: "3 consultas por dia",
    },
    pro: {
      verResultados: true,
      conferirJogos: true,
      mapaDezenas: true,
      verDetalhes: true,
      limite: "Ilimitado",
    },
  };

  return recursos[plano] || recursos.free;
}

module.exports = router;
