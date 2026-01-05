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

async function importarTimemania(caminhoArquivo) {
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`
  );
  console.log(`${colors.cyan}    IMPORTAR TIMEMANIA - EXCEL${colors.reset}`);
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
    console.log(`   Linha 1 (cabeçalho):`, dados[0]);
    console.log(`   Linha 2 (exemplo):`, dados[1]);
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

        // Colunas C até I (índices 2-8) = 7 Bolas
        const dezenas = [];
        for (let j = 2; j <= 8; j++) {
          const num = parseInt(linha[j]);
          if (num && num >= 1 && num <= 80) {
            dezenas.push(num);
          }
        }

        // Coluna J (índice 9) = Time Coração
        const timeCoracao = linha[9] ? String(linha[9]).trim() : null;

        if (dezenas.length === 7) {
          // Ordenar dezenas
          dezenas.sort((a, b) => a - b);

          await pool.query(
            `INSERT INTO timemania (concurso, dezenas, time_coracao) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (concurso) DO NOTHING`,
            [concurso, dezenas, timeCoracao]
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
        console.error(`Erro linha ${i}:`, error.message);
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
  console.log("Uso: node importarTimemania.js <arquivo.xlsx>");
  process.exit(1);
}

importarTimemania(arquivo);
