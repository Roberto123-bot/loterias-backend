// ============================================
// JOGOS ROUTES - VERSÃO FINAL CORRETA
// ============================================

const express = require("express");
const router = express.Router();

const jogosController = require("../controllers/jogosController");
const authMiddleware = require("../middlewares/authMiddleware");

// ============================================
// TODAS AS ROTAS REQUEREM AUTENTICAÇÃO
// ============================================
router.use(authMiddleware);

// ============================================
// 📁 GRUPOS
// ============================================
router.get("/grupos", jogosController.listarGrupos);
router.post("/grupos", jogosController.criarGrupo);
router.put("/grupos", jogosController.renomearGrupo);
router.delete("/grupos", jogosController.excluirGrupo);

// ============================================
// 🏷️ (se quiser manter por compatibilidade)
// ============================================
router.put("/nome", jogosController.atualizarNomeGrupo);
router.delete("/nome", jogosController.removerNomeGrupo);



// ============================================
// CONFERÊNCIA AUTOMÁTICA
// ============================================

// Conferir todos os jogos automaticamente
router.post("/conferir-todos-simples", jogosController.conferirTodosSimples);

// Conferir jogo individual (simplificado)
router.post("/:id/conferir-simples", jogosController.conferirJogoSimples);

// ============================================
// ROTAS DE JOGOS
// ============================================

// Gerar jogo aleatório
router.post("/gerar", jogosController.gerarJogoAleatorio);

// Salvar jogo
router.post("/salvar", jogosController.salvarJogo);

// Salvar jogos em lote
router.post("/salvar-lote", jogosController.salvarJogosLote);

// Listar meus jogos
router.get("/meus-jogos", jogosController.listarMeusJogos);

// ============================================
// 🚨 EXCLUSÃO EM LOTE (ANTES DE /:id)
// ============================================

router.delete("/excluir-lote", jogosController.excluirJogosEmLote);

// ============================================
// ROTAS COM ID
// ============================================

// Obter jogo específico
router.get("/:id", jogosController.getJogo);

// Atualizar jogo
router.put("/:id", jogosController.atualizarJogo);

// Excluir jogo individual
router.delete("/:id", jogosController.excluirJogo);

// Conferir jogo (manual – compatibilidade)
router.post("/:id/conferir", jogosController.conferirJogo);

// Histórico de conferências
router.get("/:id/historico", jogosController.getHistoricoConferencias);

module.exports = router;
