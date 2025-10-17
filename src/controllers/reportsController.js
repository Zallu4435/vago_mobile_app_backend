import prisma from "../config/prisma.js";

export async function getCategoryReport(req, res) {
  try {
    const { userId } = req.params;
    const { month } = req.query; // YYYY-MM optional
    const [incomeRows, expenseRows] = await Promise.all([
      prisma.transaction.groupBy({ by: ["category"], where: { userId, amount: { gt: 0 }, ...(month ? { date: { gte: new Date(`${month}-01`), lt: new Date(`${month}-31`) } } : {}) }, _sum: { amount: true } }),
      prisma.transaction.groupBy({ by: ["category"], where: { userId, amount: { lt: 0 }, ...(month ? { date: { gte: new Date(`${month}-01`), lt: new Date(`${month}-31`) } } : {}) }, _sum: { amount: true } }),
    ]);
    const incMap = Object.fromEntries(incomeRows.map(r => [r.category, Number(r._sum.amount || 0)]));
    const expMap = Object.fromEntries(expenseRows.map(r => [r.category, Math.abs(Number(r._sum.amount || 0))]));
    const merged = Array.from(new Set([...Object.keys(incMap), ...Object.keys(expMap)])).map(cat => ({
      category: cat,
      income: incMap[cat] || 0,
      expense: expMap[cat] || 0,
    })).sort((a,b) => Number(b.expense) - Number(a.expense));
    return res.status(200).json(merged);
  } catch (e) {
    console.log("Error category report", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMonthlyReport(req, res) {
  try {
    const { userId } = req.params;
    const income = await prisma.transaction.groupBy({ by: ["date"], where: { userId, amount: { gt: 0 } }, _sum: { amount: true } });
    const expense = await prisma.transaction.groupBy({ by: ["date"], where: { userId, amount: { lt: 0 } }, _sum: { amount: true } });
    const fmt = (d) => new Date(d).toISOString().slice(0,7);
    const incMap = {};
    income.forEach(r => { const k = fmt(r.date); incMap[k] = (incMap[k] || 0) + Number(r._sum.amount || 0); });
    const expMap = {};
    expense.forEach(r => { const k = fmt(r.date); expMap[k] = (expMap[k] || 0) + Math.abs(Number(r._sum.amount || 0)); });
    const months = Array.from(new Set([...Object.keys(incMap), ...Object.keys(expMap)])).sort();
    const rows = months.map(m => ({ month: m, income: incMap[m] || 0, expense: expMap[m] || 0 }));
    return res.status(200).json(rows);
  } catch (e) {
    console.log("Error monthly report", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function exportCsv(req, res) {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    const rows = await prisma.transaction.findMany({
      where: {
        userId,
        ...(startDate || endDate ? { date: { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined } } : {}),
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
      select: { id: true, title: true, amount: true, type: true, category: true, date: true, status: true, notes: true },
    });
    const header = "id,title,amount,type,category,date,status,notes\n";
    const csv =
      header +
      rows
        .map((r) => [r.id, r.title, r.amount, r.type, r.category, r.date.toISOString().slice(0,10), r.status, (r.notes || "").replaceAll('"', '""')]
          .map((v) => (v === null || v === undefined ? "" : String(v)))
          .map((v) => (v.includes(',') || v.includes('\n') ? `"${v}"` : v))
          .join(","))
        .join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=transactions.csv`);
    return res.status(200).send(csv);
  } catch (e) {
    console.log("Error export csv", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}


