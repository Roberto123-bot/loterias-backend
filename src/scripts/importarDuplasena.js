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

async function importarDuplasena(caminhoArquivo) {
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`
  );
  console.log(`${colors.cyan}    IMPORTAR DUPLA-SENA - EXCEL${colors.reset}`);
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`
  );

  try {
    console.log(
      `${colors.blue}📂 Lendo arquivo: ${caminhoArquivo}${colors.reset}`
    );

    const workbook = XLSX.readFile(caminhoArquivo);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`${colors.blue}📋 Aba: ${sheetName}${colors.reset}`);
    console.log(
      `${colors.blue}📊 Total de linhas: ${dados.length}${colors.reset}`
    );

    // Mostrar estrutura
    console.log(`${colors.yellow}\n📋 Estrutura detectada:${colors.reset}`);
    console.log(
      `   Cabeçalho:`,
      dados[0].slice(0, 10),
      "...",
      dados[0].slice(17, 23)
    );
    console.log(`   Exemplo linha 2:`);
    console.log(`     Concurso: ${dados[1][0]}`);
    console.log(
      `     1º Sorteio (C-H): ${dados[1][2]}, ${dados[1][3]}, ${dados[1][4]}, ${dados[1][5]}, ${dados[1][6]}, ${dados[1][7]}`
    );
    console.log(
      `     2º Sorteio (R-W): ${dados[1][17]}, ${dados[1][18]}, ${dados[1][19]}, ${dados[1][20]}, ${dados[1][21]}, ${dados[1][22]}`
    );
    console.log("");

    let inseridos = 0;
    let erros = 0;

    // Processar dados (pular cabeçalho linha 0)
    for (let i = 1; i < dados.length; i++) {
      const linha = dados[i];

      try {
        // Coluna A (índice 0) = Concurso
        const concurso = parseInt(linha[0]);

        if (!concurso || isNaN(concurso)) {
          continue;
        }

        // Primeiro Sorteio: Colunas C-H (índices 2-7)
        const dezenas1 = [];
        for (let j = 2; j <= 7; j++) {
          const num = parseInt(linha[j]);
          if (num && num >= 1 && num <= 50) {
            dezenas1.push(num);
          }
        }

        // Segundo Sorteio: Colunas R-W (índices 17-22)
        const dezenas2 = [];
        for (let j = 17; j <= 22; j++) {
          const num = parseInt(linha[j]);
          if (num && num >= 1 && num <= 50) {
            dezenas2.push(num);
          }
        }

        if (dezenas1.length === 6 && dezenas2.length === 6) {
          // Ordenar dezenas
          dezenas1.sort((a, b) => a - b);
          dezenas2.sort((a, b) => a - b);

          await pool.query(
            `INSERT INTO duplasena (concurso, dezenas_1, dezenas_2) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (concurso) DO NOTHING`,
            [concurso, dezenas1, dezenas2]
          );
          inseridos++;

          if (inseridos % 100 === 0) {
            process.stdout.write(
              `\r${colors.green}✓ ${i}/${dados.length} | ` +
                `Inseridos: ${inseridos}${colors.reset}`
            );
          }
        } else {
          erros++;
        }
      } catch (error) {
        erros++;
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

const arquivo = process.argv[2];

if (!arquivo) {
  console.log("Uso: node importarDuplasena.js <arquivo.xlsx>");
  process.exit(1);
}

importarDuplasena(arquivo);
