// routes/healthRoutes.js
import express from "express";

const router = express.Router();


router.get("/", (req, res) => {
  const uptimeSeconds = process.uptime();
  res.json({
    status: "ok",
    uptime: Math.floor(uptimeSeconds),
    timestamp: new Date().toISOString(),
  });
});

export default router;
