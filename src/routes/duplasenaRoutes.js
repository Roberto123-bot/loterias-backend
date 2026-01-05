const express = require("express");
const router = express.Router();
const duplasenaController = require("../controllers/duplasenaController");
const { verificarToken } = require("../middlewares/auth");
const { verificarPlano } = require("../middlewares/verificarPlano");

router.get("/", verificarToken, duplasenaController.listarTodos);
router.get("/ultimo", verificarToken, duplasenaController.buscarUltimo);
router.get("/estatisticas", verificarToken, duplasenaController.estatisticas);
router.get(
  "/:concurso",
  verificarToken,
  verificarPlano("pro"),
  duplasenaController.buscarPorConcurso
);
router.get(
  "/numero/:numero",
  verificarToken,
  verificarPlano("pro"),
  duplasenaController.buscarPorNumero
);
router.post("/", verificarToken, duplasenaController.criar);
router.delete("/:concurso", verificarToken, duplasenaController.deletar);

module.exports = router;
