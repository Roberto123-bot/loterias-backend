const cron = require("node-cron");
const { atualizarTodasLoterias } = require("./atualizadorLoterias.js");

/**
 * Configurar agendamento automático de atualizações
 */
function iniciarAgendador() {
  console.log("⏰ Agendador de atualizações iniciado!");

  // Executar a cada 6 horas (às 00:00, 06:00, 12:00, 18:00)
  cron.schedule("* * * * *", async () => {
    console.log("\n⏰ [AGENDADOR] Executando atualização automática...");
    console.log(`   Data/Hora: ${new Date().toLocaleString("pt-BR")}`);

    try {
      await atualizarTodasLoterias();
      console.log("   ✅ [AGENDADOR] Atualização concluída com sucesso!\n");
    } catch (error) {
      console.error("   ❌ [AGENDADOR] Erro na atualização:", error.message);
    }
  });

  // Opções de agendamento (descomente o que preferir):

  // A cada 1 hora (para testes)
  // cron.schedule('0 * * * *', async () => { ... });

  // A cada 3 horas
  // cron.schedule('0 */3 * * *', async () => { ... });

  // Todos os dias às 20:00 (após sorteios)
  // cron.schedule('0 20 * * *', async () => { ... });

  // De segunda a sábado às 21:00
  // cron.schedule('0 21 * * 1-6', async () => { ... });

  console.log("   📅 Próxima execução: a cada 6 horas");
  console.log(
    "   ⚙️  Para mudar frequência, edite src/services/agendador.js\n"
  );
}

/**
 * Executar atualização imediata ao iniciar o servidor (opcional)
 */
async function executarAoIniciar() {
  console.log("🚀 Executando atualização inicial...\n");

  try {
    await atualizarTodasLoterias();
    console.log("✅ Atualização inicial concluída!\n");
  } catch (error) {
    console.error("❌ Erro na atualização inicial:", error.message);
  }
}

module.exports = {
  iniciarAgendador,
  executarAoIniciar,
};
