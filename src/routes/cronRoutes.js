// routes/cronRoutes.js
const express = require("express");
const router = express.Router();
const { atualizarTodasLoterias } = require("../services/atualizadorLoterias");

router.get("/cron/atualizar", async (req, res) => {
    // 🔐 Proteção com token secreto
    if (req.query.token !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: "Não autorizado" });
    }

    try {
        const resultado = await atualizarTodasLoterias();
        res.json({
            success: true,
            message: "Atualização executada via cron",
            resultado,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

module.exports = router;
