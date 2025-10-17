import prisma from "../config/prisma.js";

export async function getBudget(req, res) {
  try {
    const { userId, month } = req.params; // month: YYYY-MM
    const row = await prisma.budget.findUnique({ 
      where: { 
        userId_month: { 
          userId, 
          month 
        } 
      } 
    });
    console.log("Budget query result:", row); // Debug log
    return res.status(200).json(row || null);
  } catch (error) {
    console.log("Error getting budget", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function upsertBudget(req, res) {
  try {
    const { userId } = req.params;
    const { month, total_limit, category_limits } = req.body;
    if (!month || !total_limit) {
      return res.status(400).json({ message: "month and total_limit are required" });
    }

    const saved = await prisma.budget.upsert({
      where: { userId_month: { userId, month } },
      update: { totalLimit: total_limit, categoryLimits: category_limits || undefined },
      create: { userId, month, totalLimit: total_limit, categoryLimits: category_limits || undefined },
    });

    return res.status(200).json(saved);
  } catch (error) {
    console.log("Error upserting budget", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}


