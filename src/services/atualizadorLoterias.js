const pool = require("../config/database");

// Configuração das loterias e suas APIs
const LOTERIAS_CONFIG = {
  megasena: {
    nome: "Mega-Sena",
    url: "https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena",
    tabela: "megasena",
    qtdDezenas: 6,
  },
  lotofacil: {
    nome: "Lotofácil",
    url: "https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil",
    tabela: "lotofacil",
    qtdDezenas: 15,
  },
  quina: {
    nome: "Quina",
    url: "https://servicebus2.caixa.gov.br/portaldeloterias/api/quina",
    tabela: "quina",
    qtdDezenas: 5,
  },
  lotomania: {
    nome: "Lotomania",
    url: "https://servicebus2.caixa.gov.br/portaldeloterias/api/lotomania",
    tabela: "lotomania",
    qtdDezenas: 20,
  },
  duplasena: {
    nome: "Dupla-Sena",
    url: "https://servicebus2.caixa.gov.br/portaldeloterias/api/duplasena",
    tabela: "duplasena",
    qtdDezenas: 12, // 6 + 6
  },
  timemania: {
    nome: "Timemania",
    url: "https://servicebus2.caixa.gov.br/portaldeloterias/api/timemania",
    tabela: "timemania",
    qtdDezenas: 10,
  },
  diadesorte: {
    nome: "Dia de Sorte",
    url: "https://servicebus2.caixa.gov.br/portaldeloterias/api/diadesorte",
    tabela: "diadasorte",
    qtdDezenas: 7,
  },
  maismilionaria: {
    nome: "+ Milionária",
    url: "https://servicebus2.caixa.gov.br/portaldeloterias/api/maismilionaria",
    tabela: "maismilionaria",
    qtdDezenas: 6,
  },
};

/**
 * Buscar último concurso cadastrado no banco
 */
async function buscarUltimoConcurso(tabela) {
  try {
    const result = await pool.query(
      `SELECT MAX(concurso) as ultimo FROM ${tabela}`
    );
    return result.rows[0].ultimo || 0;
  } catch (error) {
    console.error(
      `Erro ao buscar último concurso de ${tabela}:`,
      error.message
    );
    return 0;
  }
}

/**
 * Buscar dados de um concurso específico na API da Caixa
 */
async function buscarConcursoCaixa(loteriaId, numeroConcurso = null) {
  try {
    const config = LOTERIAS_CONFIG[loteriaId];
    const url = numeroConcurso ? `${config.url}/${numeroConcurso}` : config.url; // Último concurso

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Erro ao buscar concurso da API Caixa:`, error.message);
    return null;
  }
}

/**
 * Formatar dados do concurso para inserção no banco
 */
function formatarDados(loteriaId, dados) {
  const config = LOTERIAS_CONFIG[loteriaId];

  // ================================
  // 🔢 Extrair dezenas
  // ================================
  let dezenas = [];

  if (loteriaId === "duplasena") {
    // Dupla-Sena tem dois sorteios
    const sorteio1 = dados.listaDezenas?.slice(0, 6) || [];
    const sorteio2 = dados.listaDezenasSegundoSorteio || [];
    dezenas = [...sorteio1, ...sorteio2].map(Number);
  } else {
    dezenas = (dados.listaDezenas || []).map(Number);
  }

  // ================================
  // 🏆 Verificar se teve ganhador na faixa principal
  // ================================
  const ganhadoresFaixa1 =
    dados.listaRateioPremio?.[0]?.numeroDeGanhadores ?? 0;

  const acumulou = ganhadoresFaixa1 === 0;

  // ================================
  // 💰 Valor acumulado
  // ================================
  const valorAcumulado =
    parseFloat(dados.valorAcumuladoProximoConcurso) || 0;

  return {
    concurso: dados.numero,
    data_sorteio: dados.dataApuracao,
    dezenas,
    acumulou,
    valor_acumulado: valorAcumulado,
    valor_estimado_proximo: parseFloat(dados.valorEstimadoProximoConcurso) || 0,
    data_proximo_concurso: dados.dataProximoConcurso,
    premiacoes: dados.listaRateioPremio || [] // 👈 ADICIONE ISSO
  };
}


/**
 * Inserir concurso no banco de dados
 */
async function inserirConcurso(loteriaId, dados) {
  try {
    const config = LOTERIAS_CONFIG[loteriaId];
    const dadosFormatados = formatarDados(loteriaId, dados);

    // Verificar se concurso já existe
    const existe = await pool.query(
      `SELECT concurso FROM ${config.tabela} WHERE concurso = $1`,
      [dadosFormatados.concurso]
    );

    if (existe.rows.length > 0) {

      // 🔄 Atualizar acumulou se já existir
      await pool.query(
        `UPDATE ${config.tabela}
          SET acumulou = $1,
              valor_estimado_proximo = $2,
              premiacoes = $3
          WHERE concurso = $4`,
        [
          dadosFormatados.acumulou,                     // $1
          dadosFormatados.valor_estimado_proximo,       // $2
          JSON.stringify(dadosFormatados.premiacoes),   // $3
          dadosFormatados.concurso                      // $4
        ]
      );


      console.log(
        `🔄 Concurso ${dadosFormatados.concurso} de ${config.nome} atualizado (acumulou + premiacoes)!`
      );

      return { success: true, updated: true };
    }


    // Inserir novo concurso - tratamento especial para cada loteria
    if (loteriaId === "duplasena") {
      // Dupla-Sena tem 2 sorteios separados
      const sorteio1 = dados.listaDezenas?.slice(0, 6).map(Number) || [];
      const sorteio2 = dados.listaDezenasSegundoSorteio?.map(Number) || [];

      await pool.query(
        `INSERT INTO ${config.tabela} 
        (concurso, dezenas_1, dezenas_2, acumulou, valor_estimado_proximo, premiacoes, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          dadosFormatados.concurso,
          sorteio1,
          sorteio2,
          dadosFormatados.acumulou,
          dadosFormatados.valor_estimado_proximo,
          JSON.stringify(dadosFormatados.premiacoes)
        ]
      );
    } else if (loteriaId === "maismilionaria") {
      // + Milionária tem 6 números + 2 trevos
      const numeros = dados.listaDezenas?.map(Number) || [];
      const trevos = dados.trevosSorteados?.map(Number) || [];

      await pool.query(
        `INSERT INTO ${config.tabela} 
        (concurso, dezenas, trevos, acumulou, valor_estimado_proximo, premiacoes, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          dadosFormatados.concurso,
          numeros,
          trevos,
          dadosFormatados.acumulou,
          dadosFormatados.valor_estimado_proximo,
          JSON.stringify(dadosFormatados.premiacoes)
        ]
      );
    } else if (loteriaId === "timemania") {
      // Timemania tem dezenas + time do coração
      const timeCoracao = dados.nomeTimeCoracaoMesSorte || "";

      await pool.query(
        `INSERT INTO ${config.tabela} 
        (concurso, dezenas, time_coracao, acumulou, valor_estimado_proximo, premiacoes, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          dadosFormatados.concurso,
          dadosFormatados.dezenas,
          timeCoracao,
          dadosFormatados.acumulou,
          dadosFormatados.valor_estimado_proximo,
          JSON.stringify(dadosFormatados.premiacoes)
        ]
      );
    } else if (loteriaId === "diadesorte") {
      // Dia de Sorte tem dezenas + mês da sorte
      const mesSorte = dados.nomeTimeCoracaoMesSorte || "";

      await pool.query(
        `INSERT INTO ${config.tabela} 
        (concurso, dezenas, mes_sorte, acumulou, valor_estimado_proximo, premiacoes, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          dadosFormatados.concurso,
          dadosFormatados.dezenas,
          mesSorte,
          dadosFormatados.acumulou,
          dadosFormatados.valor_estimado_proximo,
          JSON.stringify(dadosFormatados.premiacoes)
        ]
      );
    } else {
      // ✅ VERSÃO CORRIGIDA DO INSERT PADRÃO
      await pool.query(
        `INSERT INTO ${config.tabela} 
        (concurso, dezenas, acumulou, valor_estimado_proximo, premiacoes, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          dadosFormatados.concurso,
          dadosFormatados.dezenas,
          dadosFormatados.acumulou,
          dadosFormatados.valor_estimado_proximo,
          JSON.stringify(dadosFormatados.premiacoes)
        ]
      );
    }

    console.log(
      `✅ Concurso ${dadosFormatados.concurso} de ${config.nome} inserido com sucesso!`
    );
    return {
      success: true,
      concurso: dadosFormatados.concurso,
      loteria: config.nome,
    };
  } catch (error) {
    console.error(`❌ Erro ao inserir concurso:`, error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Atualizar uma loteria específica
 * VERSÃO OTIMIZADA: Reutiliza dados do último concurso já buscado
 */
async function atualizarLoteria(loteriaId) {
  try {
    const config = LOTERIAS_CONFIG[loteriaId];
    console.log(`\n🔄 Atualizando ${config.nome}...`);

    // 1. Buscar último concurso no banco
    const ultimoBanco = await buscarUltimoConcurso(config.tabela);
    console.log(`   📊 Último no banco: ${ultimoBanco}`);

    // 2. Buscar último concurso da API (sem número = último)
    const ultimoCaixa = await buscarConcursoCaixa(loteriaId);

    if (!ultimoCaixa) {
      console.log(`   ❌ Erro ao buscar API da Caixa`);
      return {
        success: false,
        message: "Erro ao buscar API da Caixa",
        loteria: config.nome,
      };
    }

    const numeroUltimoCaixa = ultimoCaixa.numero;
    console.log(`   🌐 Último na Caixa: ${numeroUltimoCaixa}`);

    // Sempre reprocessar o último concurso
    if (numeroUltimoCaixa <= ultimoBanco) {
      console.log(`🔄 Revalidando último concurso ${numeroUltimoCaixa}...`);

      await inserirConcurso(loteriaId, ultimoCaixa);

      return {
        success: true,
        message: "Revalidado",
        novos: 0,
        loteria: config.nome,
      };
    }

    // 4. Buscar e inserir TODOS os concursos faltantes
    const novos = [];
    const total = numeroUltimoCaixa - ultimoBanco;

    console.log(`   📥 Buscando ${total} concurso(s) faltante(s)...`);

    for (let i = ultimoBanco + 1; i <= numeroUltimoCaixa; i++) {
      console.log(`   📥 Concurso ${i}...`);

      // ⭐ OTIMIZAÇÃO: Se for o último, usar dados que já temos!
      // Isso evita fazer requisição desnecessária e problemas com HTTP 500
      const dados =
        i === numeroUltimoCaixa
          ? ultimoCaixa // ← USA OS DADOS JÁ BUSCADOS!
          : await buscarConcursoCaixa(loteriaId, i); // ← SÓ BUSCA SE NÃO FOR O ÚLTIMO

      if (dados && dados.numero === i) {
        const resultado = await inserirConcurso(loteriaId, dados);
        if (resultado.success) {
          novos.push(i);
          console.log(`   ✅ Concurso ${i} inserido!`);
        } else {
          console.log(`   ⚠️  ${resultado.message}`);
        }
      } else {
        console.log(`   ⚠️  Concurso ${i} não disponível na API`);
      }

      // Aguardar 1 segundo entre requisições
      // (exceto se for o último, pois já temos os dados)
      if (i !== numeroUltimoCaixa) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(
      `   ✅ ${config.nome}: ${novos.length} de ${total} concurso(s) inserido(s)!`
    );

    return {
      success: true,
      loteria: config.nome,
      novos: novos.length,
      concursos: novos,
      totalEsperado: total,
    };
  } catch (error) {
    console.error(`❌ Erro ao atualizar ${loteriaId}:`, error.message);
    return {
      success: false,
      message: error.message,
      loteria: LOTERIAS_CONFIG[loteriaId]?.nome,
    };
  }
}

/**
 * Atualizar todas as loterias
 */
async function atualizarTodasLoterias() {
  console.log("🚀 Iniciando atualização de todas as loterias...\n");

  const resultados = {};
  let totalNovos = 0;

  for (const loteriaId of Object.keys(LOTERIAS_CONFIG)) {
    const resultado = await atualizarLoteria(loteriaId);
    resultados[loteriaId] = resultado;

    if (resultado.success && resultado.novos) {
      totalNovos += resultado.novos;
    }

    // Aguardar 2 segundos entre loterias
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(
    `\n✅ Atualização concluída! Total de novos concursos: ${totalNovos}`
  );

  return {
    success: true,
    timestamp: new Date(),
    totalNovos,
    detalhes: resultados,
  };
}

module.exports = {
  atualizarLoteria,
  atualizarTodasLoterias,
  buscarConcursoCaixa,
  LOTERIAS_CONFIG,
};
