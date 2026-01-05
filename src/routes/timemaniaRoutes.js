const express = require("express");
const router = express.Router();
const timemaniaController = require("../controllers/timemaniaController");
const { verificarToken } = require("../middlewares/auth");
const { verificarPlano } = require("../middlewares/verificarPlano");

router.get("/", verificarToken, timemaniaController.listarTodos);
router.get("/ultimo", verificarToken, timemaniaController.buscarUltimo);
router.get("/estatisticas", verificarToken, timemaniaController.estatisticas);
router.get(
  "/:concurso",
  verificarToken,
  verificarPlano("pro"),
  timemaniaController.buscarPorConcurso
);
router.get(
  "/numero/:numero",
  verificarToken,
  verificarPlano("pro"),
  timemaniaController.buscarPorNumero
);
router.post("/", verificarToken, timemaniaController.criar);
router.delete("/:concurso", verificarToken, timemaniaController.deletar);

module.exports = router;
