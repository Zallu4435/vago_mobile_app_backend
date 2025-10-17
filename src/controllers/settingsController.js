import prisma from "../config/prisma.js";

export async function getSettings(req, res) {
  try {
    const { userId } = req.params;
    const row = await prisma.setting.findUnique({ where: { userId } });
    return res.status(200).json(row || null);
  } catch (e) {
    console.log("Error get settings", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function upsertSettings(req, res) {
  try {
    const { userId } = req.params;
    const { currency, start_month, theme } = req.body;
    const saved = await prisma.setting.upsert({
      where: { userId },
      update: { currency: currency || '₹', startMonth: start_month || 4, theme: theme || 'system' },
      create: { userId, currency: currency || '₹', startMonth: start_month || 4, theme: theme || 'system' },
    });
    return res.status(200).json(saved);
  } catch (e) {
    console.log("Error upsert settings", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}


