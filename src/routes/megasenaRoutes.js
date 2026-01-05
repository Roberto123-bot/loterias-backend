const express = require("express");
const router = express.Router();
const megasenaController = require("../controllers/megasenaController");
const { verificarToken } = require("../middlewares/auth");
const { verificarPlano } = require("../middlewares/verificarPlano");

router.get("/", verificarToken, megasenaController.listarTodos);
router.get("/ultimo", verificarToken, megasenaController.buscarUltimo);
router.get("/estatisticas", verificarToken, megasenaController.estatisticas);
router.get(
  "/:concurso",
  verificarToken,
  verificarPlano("pro"),
  megasenaController.buscarPorConcurso
);
router.get(
  "/numero/:numero",
  verificarToken,
  verificarPlano("pro"),
  megasenaController.buscarPorNumero
);
router.post("/", verificarToken, megasenaController.criar);
router.delete("/:concurso", verificarToken, megasenaController.deletar);

module.exports = router;
