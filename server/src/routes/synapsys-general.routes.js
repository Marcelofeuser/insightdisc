import express from "express";
import { runSynapsysGeneral } from "../modules/synapsys/synapsys-general.service.js";

const router = express.Router();

router.post("/synapsys/general", async (req, res) => {
  try {
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({ error: "input obrigatório" });
    }

    const result = await runSynapsysGeneral({ input });

    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

export default router;
