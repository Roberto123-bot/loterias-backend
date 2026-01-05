const { exec } = require("child_process");
exec("node src/scripts/popularLoteria.js quina", { stdio: "inherit" });
