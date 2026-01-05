const pool = require("../config/database");
const CaixaAPI = require("../services/caixaAPI");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
};

const LOTERIAS = [
  {
    nome: "lotofacil",
    api: "lotofacil",
    tabela: "lotofacil",
    display: "Lotofácil",
  },
  {
    nome: "megasena",
    api: "mega-sena",
    tabela: "megasena",
    display: "Mega-Sena",
  },
  { nome: "quina", api: "quina", tabela: "quina", display: "Quina" },
  {
    nome: "lotomania",
    api: "lotomania",
    tabela: "lotomania",
    display: "Lotomania",
  },
  {
    nome: "duplasena",
    api: "duplasena",
    tabela: "duplasena",
    display: "Dupla-Sena",
    temSegundoSorteio: true,
  },
  {
    nome: "diadasorte",
    api: "diadesorte",
    tabela: "diadasorte",
    display: "Dia de Sorte",
    campoExtra: "mes_sorte",
  },
  {
    nome: "timemania",
    api: "timemania",
    tabela: "timemania",
    display: "Timemania",
    campoExtra: "time_coracao",
  },
  {
    nome: "maismilionara",
    api: "maismilionaria",
    tabela: "maismiolionaria",
    display: "+ Milionária",
    campoExtra: "trevo",
  },
];

async function popularTodas() {
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`
  );
  console.log(`${colors.cyan}    POPULAR TODAS AS LOTERIAS${colors.reset}`);
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`
  );

  for (const loteria of LOTERIAS) {
    console.log(`\n${colors.blue}📊 ${loteria.display}...${colors.reset}`);

    try {
      const api = new CaixaAPI(loteria.api);
      const ultimoData = await api.buscarUltimo();

      if (!ultimoData) {
        console.log(`${colors.red}✗ Erro ao buscar dados${colors.reset}`);
        continue;
      }

      console.log(
        `${colors.green}✓ Último concurso: ${ultimoData.numero}${colors.reset}`
      );

      // Popular últimos 50 concursos de cada
      const inicio = Math.max(1, ultimoData.numero - 50);

      for (let i = inicio; i <= ultimoData.numero; i++) {
        const dados = await api.buscarConcurso(i);

        if (dados) {
          let query, values;

          if (loteria.temSegundoSorteio) {
            query = `INSERT INTO ${loteria.tabela} (concurso, dezenas_1, dezenas_2) VALUES ($1, $2, $3) ON CONFLICT (concurso) DO NOTHING`;
            values = [dados.concurso, dados.dezenas_1, dados.dezenas_2];
          } else if (loteria.campoExtra) {
            query = `INSERT INTO ${loteria.tabela} (concurso, dezenas, ${loteria.campoExtra}) VALUES ($1, $2, $3) ON CONFLICT (concurso) DO NOTHING`;
            values = [
              dados.concurso,
              dados.dezenas,
              dados[loteria.campoExtra] || null,
            ];
          } else {
            query = `INSERT INTO ${loteria.tabela} (concurso, dezenas) VALUES ($1, $2) ON CONFLICT (concurso) DO NOTHING`;
            values = [dados.concurso, dados.dezenas];
          }

          await pool.query(query, values);
        }

        await new Promise((r) => setTimeout(r, 30));
      }

      console.log(`${colors.green}✓ Concluído!${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}✗ Erro: ${error.message}${colors.reset}`);
    }
  }

  console.log(
    `\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`
  );
  console.log(`${colors.green}✓ TODAS AS LOTERIAS POPULADAS!${colors.reset}`);
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`
  );

  await pool.end();
  process.exit(0);
}

popularTodas();
