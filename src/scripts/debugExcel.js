const XLSX = require("xlsx");

const arquivo = process.argv[2];

if (!arquivo) {
  console.log("Uso: node debugExcel.js <arquivo.xlsx>");
  process.exit(1);
}

console.log("📂 Lendo:", arquivo);

const workbook = XLSX.readFile(arquivo);

console.log("\n📋 Abas disponíveis:", workbook.SheetNames);

workbook.SheetNames.forEach((sheetName) => {
  console.log(`\n📊 Aba: ${sheetName}`);
  const worksheet = workbook.Sheets[sheetName];
  const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log(`   Total de linhas: ${dados.length}`);
  console.log("\n   Primeiras 5 linhas:");

  dados.slice(0, 5).forEach((linha, i) => {
    console.log(`   ${i}:`, linha);
  });
});
