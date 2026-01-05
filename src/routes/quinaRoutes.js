const express = require("express");
const router = express.Router();
const quinaController = require("../controllers/quinaController");
const { verificarToken } = require("../middlewares/auth");
const { verificarPlano } = require("../middlewares/verificarPlano");

router.get("/", verificarToken, quinaController.listarTodos);
router.get("/ultimo", verificarToken, quinaController.buscarUltimo);
router.get("/estatisticas", verificarToken, quinaController.estatisticas);
router.get(
  "/:concurso",
  verificarToken,
  verificarPlano("pro"),
  quinaController.buscarPorConcurso
);
router.get(
  "/numero/:numero",
  verificarToken,
  verificarPlano("pro"),
  quinaController.buscarPorNumero
);
router.post("/", verificarToken, quinaController.criar);
router.delete("/:concurso", verificarToken, quinaController.deletar);

module.exports = router;
