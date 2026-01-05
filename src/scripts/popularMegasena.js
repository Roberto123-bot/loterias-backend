const { exec } = require("child_process");
exec("node src/scripts/popularLoteria.js megasena", { stdio: "inherit" });
