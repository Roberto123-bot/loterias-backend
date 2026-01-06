require("dotenv").config(); // No topo do arquivo
const express = require("express");
const cors = require("cors"); // ⭐ ADICIONAR ESTA LINHA
const app = express();
const pool = require("./config/database");
const errorHandler = require("./middlewares/errorHandler");
const resultadosRoutes = require("./routes/resultadosRoutes");

// ============================================
// CONFIGURAÇÃO DE CORS - MUITO IMPORTANTE! ⭐
// ============================================
const allowedOrigins = [
  process.env.FRONTEND_URL, // Vercel (produção)
  "https://loterias-frontend.vercel.app", // Backup hardcoded
  "http://localhost:3000", // Desenvolvimento
  "http://localhost:5173", // Vite dev
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  // 🔥 ADICIONE ESTAS DUAS
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];

// Remover valores undefined/null
const validOrigins = allowedOrigins.filter(
  (origin) => origin && origin.trim() !== ""
);

console.log("✅ CORS configurado para:", validOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sem origin (mobile apps, curl, etc)
      if (!origin) {
        return callback(null, true);
      }

      // Verificar se origin está na lista
      if (validOrigins.indexOf(origin) === -1) {
        console.warn(`⚠️ Origin bloqueada pelo CORS: ${origin}`);
        return callback(
          new Error(`Origin não permitida pelo CORS: ${origin}`),
          false
        );
      }

      console.log(`✅ Origin permitida: ${origin}`);
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ============================================
// IMPORTAR ROTAS DE AUTENTICAÇÃO
// ============================================
const authRoutes = require("./routes/auth");
const jogosRoutes = require("./routes/jogosRoutes");

// ============================================
// IMPORTAR ROTAS DE LOTERIAS
// ============================================
const lotofacilRoutes = require("./routes/lotofacilRoutes");
const megasenaRoutes = require("./routes/megasenaRoutes");
const quinaRoutes = require("./routes/quinaRoutes");
const lotomaniaRoutes = require("./routes/lotomaniaRoutes");
const duplasenaRoutes = require("./routes/duplasenaRoutes");
const diadasorteRoutes = require("./routes/diadasorteRoutes");
const timemaniaRoutes = require("./routes/timemaniaRoutes");
const maismilionariaRoutes = require("./routes/maismilionariaRoutes");

// ============================================
// IMPORTAR ROTAS DE USUÁRIO E PLANOS
// ============================================
const usuarioRoutes = require("./routes/usuarioRoutes");
const planosRoutes = require("./routes/planosRoutes");

// ============================================
// IMPORTAR ROTAS ADMIN
// ============================================
const adminRoutes = require("./routes/adminRoutes");

// ============================================
// IMPORTAR ROTAS DE ATUALIZAÇÃO E AGENDADOR
// ============================================
const atualizadorRoutes = require("./routes/atualizadorRoutes");
const { iniciarAgendador } = require("./services/agendador");

// ============================================
// MIDDLEWARES (ORDEM CORRETA)
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("src/public"));

// Middleware de log
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ============================================
// ROTAS DE AUTENTICAÇÃO E USUÁRIO
// ============================================
app.use("/api/auth", authRoutes);
app.use("/api/jogos", jogosRoutes);
app.use("/usuarios", usuarioRoutes);
app.use("/api/resultados", resultadosRoutes);

// ============================================
// ROTAS DE PLANOS
// ============================================
app.use("/api/planos", planosRoutes);

// ============================================
// ROTAS ADMIN
// ============================================
app.use("/api/admin", adminRoutes);

// ============================================
// ROTAS DE ATUALIZAÇÃO
// ============================================
app.use("/api/atualizar", atualizadorRoutes);

// ============================================
// ROTA RAIZ - DOCUMENTAÇÃO DA API
// ============================================
app.get("/", (req, res) => {
  res.json({
    message: "🎰 API de Loterias - Node.js + PostgreSQL + Docker",
    version: "3.0.0",
    cors: {
      enabled: true,
      allowedOrigins: validOrigins,
      frontendUrl: process.env.FRONTEND_URL || "não configurado",
    },
    features: [
      "✅ Sistema de autenticação JWT",
      "✅ Planos FREE e PRÓ",
      "✅ Atualização automática de resultados",
      "✅ 8 loterias brasileiras",
      "✅ Estatísticas e análises",
      "✅ Conferência de jogos (PRÓ)",
      "✅ Painel Administrativo",
    ],
    loterias: {
      lotofacil: {
        endpoint: "/lotofacil",
        dezenas: 15,
        faixa: "1-25",
      },
      megasena: {
        endpoint: "/megasena",
        dezenas: 6,
        faixa: "1-60",
      },
      quina: {
        endpoint: "/quina",
        dezenas: 5,
        faixa: "1-80",
      },
      lotomania: {
        endpoint: "/lotomania",
        dezenas: 20,
        faixa: "0-99",
      },
      duplasena: {
        endpoint: "/duplasena",
        dezenas: "6 + 6 (2 sorteios)",
        faixa: "1-50",
      },
      diadasorte: {
        endpoint: "/diadasorte",
        dezenas: "7 + mês",
        faixa: "1-31",
      },
      timemania: {
        endpoint: "/timemania",
        dezenas: "7 + time",
        faixa: "1-80",
      },
      maismilionaria: {
        endpoint: "/maismilionaria",
        dezenas: "6 + 2 trevos",
        faixa: "1-50 (dezenas), 1-6 (trevos)",
      },
    },
    endpoints: {
      // Autenticação
      login: "POST /api/auth/login",
      registro: "POST /api/auth/registro",
      verificar: "GET /api/auth/verificar",

      // Planos
      meuPlano: "GET /api/planos/meu-plano",
      upgrade: "POST /api/planos/upgrade",
      recursos: "GET /api/planos/recursos",

      // Admin
      adminDashboard: "GET /api/admin/dashboard [ADMIN]",
      adminUsuarios: "GET /api/admin/usuarios [ADMIN]",
      adminAtivar: "POST /api/admin/usuarios/:id/ativar [ADMIN]",
      adminDesativar: "POST /api/admin/usuarios/:id/desativar [ADMIN]",
      adminHistorico: "GET /api/admin/historico [ADMIN]",
      adminAlertas: "GET /api/admin/alertas [ADMIN]",

      // Loterias (Públicas - FREE + PRÓ)
      listar: "GET /{loteria}",
      ultimo: "GET /{loteria}/ultimo",
      estatisticas: "GET /{loteria}/estatisticas",

      // Loterias (Bloqueadas - Apenas PRÓ)
      detalhes: "GET /{loteria}/:concurso [PRÓ]",
      conferir: "POST /{loteria}/conferir [PRÓ]",
      analise: "GET /{loteria}/analise/* [PRÓ]",
      historico: "GET /{loteria}/historico/:dezena [PRÓ]",

      // Atualização
      atualizarTodas: "GET /api/atualizar",
      atualizarLoteria: "GET /api/atualizar/:loteria",
      status: "GET /api/atualizar/status/loterias",
    },
    planos: {
      free: {
        recursos: [
          "Ver últimos resultados",
          "Listar concursos",
          "Estatísticas básicas (top 10)",
        ],
        limitacoes: [
          "Não pode conferir jogos",
          "Não pode ver detalhes completos",
          "Não pode ver análises avançadas",
        ],
      },
      pro: {
        recursos: [
          "Todos recursos do FREE",
          "Conferir jogos ilimitadamente",
          "Ver detalhes completos",
          "Estatísticas completas",
          "Análise de frequência",
          "Histórico de dezenas",
          "Mapa das dezenas",
        ],
        preco: "Sob consulta",
      },
    },
  });
});

// ============================================
// HEALTH CHECK
// ============================================
app.get("/health", async (req, res) => {
  try {
    const dbCheck = await pool.query("SELECT 1");
    res.json({
      status: "OK",
      database: "Connected",
      timestamp: new Date(),
      server: {
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || "development",
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      database: "Disconnected",
      error: error.message,
      timestamp: new Date(),
    });
  }
});

// ============================================
// ROTAS DAS LOTERIAS
// ============================================
app.use("/lotofacil", lotofacilRoutes);
app.use("/megasena", megasenaRoutes);
app.use("/quina", quinaRoutes);
app.use("/lotomania", lotomaniaRoutes);
app.use("/duplasena", duplasenaRoutes);
app.use("/diadasorte", diadasorteRoutes);
app.use("/timemania", timemaniaRoutes);
app.use("/maismilionaria", maismilionariaRoutes);

// ============================================
// ROTA 404
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Rota não encontrada",
    path: req.path,
    method: req.method,
    sugestoes: [
      "Verifique a URL",
      "Consulte a documentação em GET /",
      "Verifique se está autenticado (header Authorization)",
    ],
  });
});

// ============================================
// MIDDLEWARE DE ERRO
// ============================================
app.use(errorHandler);

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = Number(process.env.PORT);

if (!PORT) {
  throw new Error("PORT não definida pelo ambiente");
}
const NODE_ENV = process.env.NODE_ENV || "development";

const isProduction = NODE_ENV === "production";

app.listen(PORT, "0.0.0.0", () => {
  console.log("\n" + "=".repeat(50));
  console.log("🎰 SISTEMA DE LOTERIAS - API REST");
  console.log("=".repeat(50));

  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Ambiente: ${NODE_ENV}`);

  if (!isProduction) {
    console.log(`🚀 Servidor escutando na porta ${PORT}`);
    console.log(`📊 Documentação: http://localhost:${PORT}/`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
    console.log(`🔐 Painel Admin: http://localhost:${PORT}/admin.html`);
  } else {
    console.log("🌍 Executando em PRODUÇÃO (Railway)");
  }

  console.log("=".repeat(50));
  console.log("\n📋 Recursos Disponíveis:");
  console.log("   ✅ Sistema de autenticação JWT");
  console.log("   ✅ Planos FREE e PRÓ");
  console.log("   ✅ 8 loterias brasileiras");
  console.log("   ✅ Atualização automática de resultados");
  console.log("   ✅ Estatísticas e análises");
  console.log("   ✅ Painel Administrativo");

  console.log("\n🌐 CORS configurado para:");
  validOrigins.forEach((origin) => {
    console.log(`   ✅ ${origin}`);
  });

  console.log("\n⏰ Iniciando agendador de atualizações...");
  console.log("🔐 JWT configurado:", !!process.env.JWT_SECRET);

  // Iniciar agendador de atualizações
  const isDev = NODE_ENV === "development";

  if (process.env.ENABLE_CRON === "true" || isDev) {
    iniciarAgendador();
  } else {
    console.log("⏸️  Agendador desativado");
  }

  console.log("=".repeat(50) + "\n");
});

// ============================================
// TRATAMENTO DE ERROS NÃO CAPTURADOS
// ============================================
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  if (process.env.NODE_ENV !== "production") {
    process.exit(1);
  }
});
