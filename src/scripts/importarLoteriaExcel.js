const XLSX = require("xlsx");
const pool = require("../config/database");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
};

const LOTERIAS_CONFIG = {
  megasena: {
    tabela: "megasena",
    nome: "Mega-Sena",
    qtdDezenas: 6,
    faixaDezenas: [1, 60],
    colunaDezenas: 2,
  },
  lotofacil: {
    tabela: "lotofacil",
    nome: "Lotofácil",
    qtdDezenas: 15,
    faixaDezenas: [1, 25],
    colunaDezenas: 2,
  },
  quina: {
    tabela: "quina",
    nome: "Quina",
    qtdDezenas: 5,
    faixaDezenas: [1, 80],
    colunaDezenas: 2,
  },
  lotomania: {
    tabela: "lotomania",
    nome: "Lotomania",
    qtdDezenas: 20,
    faixaDezenas: [0, 99],
    colunaDezenas: 2,
  },
  duplasena: {
    tabela: "duplasena",
    nome: "Dupla-Sena",
    qtdDezenas: 6,
    faixaDezenas: [1, 50],
    colunaDezenas: 2,
    colunaSegundoSorteio: 17,
    temSegundoSorteio: true,
  },
  diadasorte: {
    tabela: "diadasorte",
    nome: "Dia de Sorte",
    qtdDezenas: 7,
    faixaDezenas: [1, 31],
    colunaDezenas: 2,
    campoExtra: "mes_sorte",
    colunaExtra: 9, // Mês após as 7 dezenas
  },
  timemania: {
    tabela: "timemania",
    nome: "Timemania",
    qtdDezenas: 7,
    faixaDezenas: [1, 80],
    colunaDezenas: 2,
    campoExtra: "time_coracao",
    colunaExtra: 9,
  },
  // ⭐ NOVO: +Milionária
  maismilionaria: {
    tabela: "maismilionaria",
    nome: "+Milionária",
    qtdDezenas: 6,
    faixaDezenas: [1, 50],
    colunaDezenas: 2, // Dezenas: colunas C até H (2-7)
    qtdTrevos: 2,
    faixaTrevos: [1, 6],
    colunaTrevos: 8, // Trevos: colunas I e J (8-9)
    temTrevos: true,
  },
};

async function importarLoteria(loteria, caminhoArquivo) {
  const config = LOTERIAS_CONFIG[loteria];

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
    `${colors.cyan}    IMPORTAR ${config.nome.toUpperCase()} - EXCEL${
      colors.reset
    }`
  );
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`
  );

  try {
    console.log(
      `${colors.blue}📂 Lendo arquivo: ${caminhoArquivo}${colors.reset}`
    );

    const workbook = XLSX.readFile(caminhoArquivo, {
      type: "binary",
      cellDates: false,
    });

    // Usar primeira aba ou procurar aba com dados
    let sheetName = workbook.SheetNames[0];
    let dados = [];

    for (const name of workbook.SheetNames) {
      const worksheet = workbook.Sheets[name];
      const temp = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (temp.length > 100) {
        sheetName = name;
        dados = temp;
        break;
      }
    }

    console.log(`${colors.blue}📋 Aba: ${sheetName}${colors.reset}`);
    console.log(
      `${colors.blue}📊 Total de linhas: ${dados.length}${colors.reset}\n`
    );

    if (dados.length < 2) {
      console.error(
        `${colors.red}❌ Arquivo vazio ou com apenas cabeçalho!${colors.reset}`
      );
      process.exit(1);
    }

    let inseridos = 0;
    let erros = 0;
    const [min, max] = config.faixaDezenas;

    // Processar dados (pular cabeçalho linha 0)
    for (let i = 1; i < dados.length; i++) {
      const linha = dados[i];

      try {
        const concurso = parseInt(linha[0]);

        if (!concurso || isNaN(concurso)) {
          continue;
        }

        // ⭐ +MILIONÁRIA (6 dezenas + 2 trevos)
        if (config.temTrevos) {
          const dezenas = [];
          const trevos = [];

          // Ler 6 dezenas (colunas C até H)
          for (
            let j = config.colunaDezenas;
            j < config.colunaDezenas + config.qtdDezenas;
            j++
          ) {
            const num = parseInt(linha[j]);
            if (num && num >= min && num <= max) {
              dezenas.push(num);
            }
          }

          // Ler 2 trevos (colunas I e J)
          const [minTrevo, maxTrevo] = config.faixaTrevos;
          for (
            let j = config.colunaTrevos;
            j < config.colunaTrevos + config.qtdTrevos;
            j++
          ) {
            const trevo = parseInt(linha[j]);
            if (trevo && trevo >= minTrevo && trevo <= maxTrevo) {
              trevos.push(trevo);
            }
          }

          if (
            dezenas.length === config.qtdDezenas &&
            trevos.length === config.qtdTrevos
          ) {
            dezenas.sort((a, b) => a - b);
            trevos.sort((a, b) => a - b);

            await pool.query(
              `INSERT INTO ${config.tabela} (concurso, dezenas, trevos) 
               VALUES ($1, $2, $3) 
               ON CONFLICT (concurso) DO NOTHING`,
              [concurso, dezenas, trevos]
            );
            inseridos++;
          }
        }
        // DUPLA-SENA (2 sorteios)
        else if (config.temSegundoSorteio) {
          const dezenas1 = [];
          const dezenas2 = [];

          // Primeiro sorteio (6 dezenas)
          for (
            let j = config.colunaDezenas;
            j < config.colunaDezenas + 6;
            j++
          ) {
            const num = parseInt(linha[j]);
            if (num && num >= min && num <= max) {
              dezenas1.push(num);
            }
          }

          // Segundo sorteio
          const inicioSegundo =
            config.colunaSegundoSorteio || config.colunaDezenas + 6;
          for (let j = inicioSegundo; j < inicioSegundo + 6; j++) {
            const num = parseInt(linha[j]);
            if (num && num >= min && num <= max) {
              dezenas2.push(num);
            }
          }

          if (dezenas1.length === 6 && dezenas2.length === 6) {
            dezenas1.sort((a, b) => a - b);
            dezenas2.sort((a, b) => a - b);

            await pool.query(
              `INSERT INTO ${config.tabela} (concurso, dezenas_1, dezenas_2) 
               VALUES ($1, $2, $3) 
               ON CONFLICT (concurso) DO NOTHING`,
              [concurso, dezenas1, dezenas2]
            );
            inseridos++;
          }
        }
        // DIA DE SORTE / TIMEMANIA (com campo extra)
        else if (config.campoExtra) {
          const dezenas = [];

          for (
            let j = config.colunaDezenas;
            j < config.colunaDezenas + config.qtdDezenas;
            j++
          ) {
            const num = parseInt(linha[j]);
            if (num && num >= min && num <= max) {
              dezenas.push(num);
            }
          }

          if (dezenas.length === config.qtdDezenas) {
            dezenas.sort((a, b) => a - b);

            // Campo extra (mês ou time)
            const campoExtra = linha[config.colunaExtra] || null;

            await pool.query(
              `INSERT INTO ${config.tabela} (concurso, dezenas, ${config.campoExtra}) 
               VALUES ($1, $2, $3) 
               ON CONFLICT (concurso) DO NOTHING`,
              [concurso, dezenas, campoExtra]
            );
            inseridos++;
          }
        }
        // LOTERIAS NORMAIS (Mega-Sena, Lotofácil, Quina, Lotomania)
        else {
          const dezenas = [];

          for (
            let j = config.colunaDezenas;
            j < config.colunaDezenas + config.qtdDezenas;
            j++
          ) {
            const num = parseInt(linha[j]);
            if (num && num >= min && num <= max) {
              dezenas.push(num);
            }
          }

          if (dezenas.length === config.qtdDezenas) {
            dezenas.sort((a, b) => a - b);

            await pool.query(
              `INSERT INTO ${config.tabela} (concurso, dezenas) 
               VALUES ($1, $2) 
               ON CONFLICT (concurso) DO NOTHING`,
              [concurso, dezenas]
            );
            inseridos++;
          }
        }

        if (inseridos % 100 === 0 && inseridos > 0) {
          process.stdout.write(
            `\r${colors.green}✓ ${i}/${dados.length} | ` +
              `Inseridos: ${inseridos}${colors.reset}`
          );
        }
      } catch (error) {
        erros++;
        if (erros < 10) {
          console.error(
            `${colors.red}Erro linha ${i}:${colors.reset}`,
            error.message
          );
        }
      }
    }

    console.log(
      `\n\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`
    );
    console.log(`${colors.green}✓ IMPORTAÇÃO CONCLUÍDA!${colors.reset}`);
    console.log(`${colors.green}✓ Inseridos: ${inseridos}${colors.reset}`);
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

const loteria = process.argv[2];
const arquivo = process.argv[3];

if (!loteria || !arquivo) {
  console.log(
    `${colors.yellow}Uso: node importarLoteriaExcel.js <loteria> <arquivo.xlsx>${colors.reset}`
  );
  console.log(`${colors.yellow}Loterias disponíveis:${colors.reset}`);
  console.log(
    `  ${colors.cyan}megasena, lotofacil, quina, lotomania${colors.reset}`
  );
  console.log(
    `  ${colors.cyan}duplasena, diadasorte, timemania${colors.reset}`
  );
  console.log(`  ${colors.cyan}maismilionaria${colors.reset} ⭐ NOVO\n`);
  console.log(`${colors.cyan}Exemplos:${colors.reset}`);
  console.log(
    `  node importarLoteriaExcel.js megasena /app/dados/MEGASENA.xlsx`
  );
  console.log(
    `  node importarLoteriaExcel.js maismilionaria /app/dados/MAISMILIONARIA.xlsx`
  );
  process.exit(1);
}

importarLoteria(loteria, arquivo);
