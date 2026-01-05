const express = require("express");
const router = express.Router();
const maismilionariaController = require("../controllers/maismilionariaController");
const { verificarToken } = require("../middlewares/auth");
const { verificarPlano } = require("../middlewares/verificarPlano");

router.get("/", verificarToken, maismilionariaController.listarTodos);
router.get("/ultimo", verificarToken, maismilionariaController.buscarUltimo);
router.get(
  "/estatisticas",
  verificarToken,
  maismilionariaController.estatisticas
);
router.get(
  "/:concurso",
  verificarToken,
  verificarPlano("pro"),
  maismilionariaController.buscarPorConcurso
);
router.get(
  "/numero/:numero",
  verificarToken,
  verificarPlano("pro"),
  maismilionariaController.buscarPorNumero
);
router.post("/", verificarToken, maismilionariaController.criar);
router.delete("/:concurso", verificarToken, maismilionariaController.deletar);

module.exports = router;
