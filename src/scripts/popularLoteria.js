const pool = require("../config/database");
const CaixaAPI = require("../services/caixaAPI");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
};

const LOTERIAS_CONFIG = {
  lotofacil: { tabela: "lotofacil", nome: "Lotofácil", api: "lotofacil" },
  megasena: { tabela: "megasena", nome: "Mega-Sena", api: "mega-sena" },
  quina: { tabela: "quina", nome: "Quina", api: "quina" },
  lotomania: { tabela: "lotomania", nome: "Lotomania", api: "lotomania" },
  duplasena: {
    tabela: "duplasena",
    nome: "Dupla-Sena",
    api: "duplasena",
    temSegundoSorteio: true,
  },
  diadasorte: {
    tabela: "diadasorte",
    nome: "Dia de Sorte",
    api: "diadesorte",
    campoExtra: "mes_sorte",
  },
  timemania: {
    tabela: "timemania",
    nome: "Timemania",
    api: "timemania",
    campoExtra: "time_coracao",
  },
};

async function popularLoteria(
  nomeLoteria,
  concursoInicial = 1,
  concursoFinal = null
) {
  const config = LOTERIAS_CONFIG[nomeLoteria];

  if (!config) {
    console.error(
      `${colors.red}Loteria inválida! Use: ${Object.keys(LOTERIAS_CONFIG).join(
        ", "
      )}${colors.reset}`
    );
    process.exit(1);
  }

  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`
  );
  console.log(
    `${colors.cyan}    POPULAR ${config.nome.toUpperCase()}${colors.reset}`
  );
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`
  );

  try {
    const api = new CaixaAPI(config.api);

    // Buscar último concurso
    const ultimoConcursoData = await api.buscarUltimo();
    if (!ultimoConcursoData) {
      console.error(
        `${colors.red}Erro ao buscar último concurso${colors.reset}`
      );
      process.exit(1);
    }

    const ultimoConcurso = concursoFinal || ultimoConcursoData.numero;
    console.log(
      `${colors.green}✓ Último concurso: ${ultimoConcurso}${colors.reset}\n`
    );

    const { rows } = await pool.query(`SELECT COUNT(*) FROM ${config.tabela}`);
    console.log(
      `${colors.blue}📊 Já cadastrados: ${rows[0].count}${colors.reset}\n`
    );

    let inseridos = 0;
    let pulados = 0;
    let erros = 0;
    const total = ultimoConcurso - concursoInicial + 1;

    for (let i = concursoInicial; i <= ultimoConcurso; i++) {
      const dados = await api.buscarConcurso(i);

      if (dados) {
        try {
          let query, values;

          if (config.temSegundoSorteio) {
            // Dupla-Sena
            query = `INSERT INTO ${config.tabela} (concurso, dezenas_1, dezenas_2) VALUES ($1, $2, $3) ON CONFLICT (concurso) DO NOTHING`;
            values = [dados.concurso, dados.dezenas_1, dados.dezenas_2];
          } else if (config.campoExtra === "mes_sorte") {
            // Dia de Sorte
            query = `INSERT INTO ${config.tabela} (concurso, dezenas, mes_sorte) VALUES ($1, $2, $3) ON CONFLICT (concurso) DO NOTHING`;
            values = [dados.concurso, dados.dezenas, dados.mes_sorte || null];
          } else if (config.campoExtra === "time_coracao") {
            // Timemania
            query = `INSERT INTO ${config.tabela} (concurso, dezenas, time_coracao) VALUES ($1, $2, $3) ON CONFLICT (concurso) DO NOTHING`;
            values = [
              dados.concurso,
              dados.dezenas,
              dados.time_coracao || null,
            ];
          } else {
            // Loterias padrão
            query = `INSERT INTO ${config.tabela} (concurso, dezenas) VALUES ($1, $2) ON CONFLICT (concurso) DO NOTHING`;
            values = [dados.concurso, dados.dezenas];
          }

          const result = await pool.query(query, values);

          if (result.rowCount > 0) {
            inseridos++;
          } else {
            pulados++;
          }

          const progresso = (((i - concursoInicial + 1) / total) * 100).toFixed(
            1
          );
          process.stdout.write(
            `\r${colors.green}✓ ${i}/${ultimoConcurso} (${progresso}%) | ` +
              `Inseridos: ${inseridos} | Pulados: ${pulados} | Erros: ${erros}${colors.reset}`
          );
        } catch (error) {
          erros++;
        }
      } else {
        erros++;
      }

      // Delay para não sobrecarregar a API
      await new Promise((r) => setTimeout(r, 50));
    }

    console.log(
      `\n\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`
    );
    console.log(`${colors.green}✓ CONCLUÍDO!${colors.reset}`);
    console.log(`${colors.green}✓ Inseridos: ${inseridos}${colors.reset}`);
    console.log(`${colors.yellow}⏭️  Pulados: ${pulados}${colors.reset}`);
    console.log(`${colors.red}✗ Erros: ${erros}${colors.reset}`);
    console.log(
      `${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`
    );
  } catch (error) {
    console.error(`\n${colors.red}ERRO:${colors.reset}`, error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Executar
const loteria = process.argv[2];
const inicio = parseInt(process.argv[3]) || 1;
const fim = parseInt(process.argv[4]) || null;

if (!loteria) {
  console.log(
    `${colors.yellow}Uso: node popularLoteria.js <loteria> [inicio] [fim]${colors.reset}`
  );
  console.log(
    `${colors.yellow}Loterias disponíveis: ${Object.keys(LOTERIAS_CONFIG).join(
      ", "
    )}${colors.reset}`
  );
  console.log(`\n${colors.cyan}Exemplos:${colors.reset}`);
  console.log(`  node popularLoteria.js megasena 2600`);
  console.log(`  node popularLoteria.js quina 6300 6400`);
  console.log(`  node popularLoteria.js lotofacil`);
  process.exit(1);
}

popularLoteria(loteria, inicio, fim);
