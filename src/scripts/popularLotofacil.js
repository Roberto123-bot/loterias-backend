const pool = require("../config/database");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
};

async function buscarConcurso(numeroConcurso) {
  try {
    const response = await fetch(
      `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${numeroConcurso}`
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

async function buscarUltimoConcurso() {
  try {
    const response = await fetch(
      "https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil"
    );
    const data = await response.json();
    return data.numero;
  } catch (error) {
    console.error(`${colors.red}Erro ao buscar último concurso${colors.reset}`);
    throw error;
  }
}

async function inserirConcurso(concurso, dezenas) {
  try {
    await pool.query(
      "INSERT INTO lotofacil (concurso, dezenas) VALUES ($1, $2) ON CONFLICT (concurso) DO NOTHING",
      [concurso, dezenas]
    );
    return true;
  } catch (error) {
    return false;
  }
}

async function popularBanco(concursoInicial = 1, concursoFinal = null) {
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`
  );
  console.log(`${colors.cyan}    POPULAR LOTOFÁCIL (SIMPLES)${colors.reset}`);
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`
  );

  try {
    const ultimoConcurso = concursoFinal || (await buscarUltimoConcurso());
    console.log(
      `${colors.green}✓ Último concurso: ${ultimoConcurso}${colors.reset}\n`
    );

    const { rows } = await pool.query("SELECT COUNT(*) FROM lotofacil");
    console.log(
      `${colors.blue}📊 Já cadastrados: ${rows[0].count}${colors.reset}\n`
    );

    let inseridos = 0;
    let pulados = 0;
    let erros = 0;
    const total = ultimoConcurso - concursoInicial + 1;

    for (let i = concursoInicial; i <= ultimoConcurso; i++) {
      const dados = await buscarConcurso(i);

      if (dados && dados.listaDezenas) {
        // Converter dezenas de string para número
        const dezenas = dados.listaDezenas.map((d) => parseInt(d));

        const sucesso = await inserirConcurso(dados.numero, dezenas);

        if (sucesso) {
          inseridos++;
          const progresso = ((i / total) * 100).toFixed(1);
          process.stdout.write(
            `\r${colors.green}✓ ${i}/${ultimoConcurso} (${progresso}%) | ` +
              `Inseridos: ${inseridos} | Erros: ${erros}${colors.reset}`
          );
        } else {
          pulados++;
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
const inicio = parseInt(process.argv[2]) || 1;
const fim = parseInt(process.argv[3]) || null;

popularBanco(inicio, fim);
