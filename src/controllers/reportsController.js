import prisma from "../config/prisma.js";

export async function getCategoryReport(req, res) {
  try {
    const { userId } = req.params;
    const { month, startDate, endDate, period } = req.query;
    
    // Build date filter based on parameters
    let dateFilter = {};
    
    if (month) {
      // Specific month (YYYY-MM)
      const startOfMonth = new Date(`${month}-01`);
      const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);
      dateFilter = { 
        date: { 
          gte: startOfMonth, 
          lte: endOfMonth 
        } 
      };
    } else if (startDate && endDate) {
      // Custom date range
      dateFilter = { 
        date: { 
          gte: new Date(startDate), 
          lte: new Date(endDate) 
        } 
      };
    } else if (period) {
      // Predefined periods
      const now = new Date();
      let start, end = now;
      
      switch (period) {
        case '3months':
          start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case '6months':
          start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          break;
        case 'year':
          start = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          break;
        case 'currentMonth':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'lastMonth':
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          end = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        default:
          // No date filter for 'all'
          break;
      }
      
      if (period !== 'all') {
        dateFilter = { 
          date: { 
            gte: start, 
            lte: end 
          } 
        };
      }
    }
    
    const [incomeRows, expenseRows] = await Promise.all([
      prisma.transaction.groupBy({ 
        by: ["category"], 
        where: { 
          userId, 
          amount: { gt: 0 }, 
          ...dateFilter 
        }, 
        _sum: { amount: true } 
      }),
      prisma.transaction.groupBy({ 
        by: ["category"], 
        where: { 
          userId, 
          amount: { lt: 0 }, 
          ...dateFilter 
        }, 
        _sum: { amount: true } 
      }),
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
    const { startDate, endDate, period, limit } = req.query;
    
    // Build date filter based on parameters
    let dateFilter = {};
    
    if (startDate && endDate) {
      // Custom date range
      dateFilter = { 
        date: { 
          gte: new Date(startDate), 
          lte: new Date(endDate) 
        } 
      };
    } else if (period) {
      // Predefined periods
      const now = new Date();
      let start, end = now;
      
      switch (period) {
        case '3months':
          start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case '6months':
          start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          break;
        case 'year':
          start = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          break;
        case 'currentMonth':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'lastMonth':
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          end = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        default:
          // No date filter for 'all'
          break;
      }
      
      if (period !== 'all') {
        dateFilter = { 
          date: { 
            gte: start, 
            lte: end 
          } 
        };
      }
    }
    
    const income = await prisma.transaction.groupBy({ 
      by: ["date"], 
      where: { 
        userId, 
        amount: { gt: 0 }, 
        ...dateFilter 
      }, 
      _sum: { amount: true } 
    });
    
    const expense = await prisma.transaction.groupBy({ 
      by: ["date"], 
      where: { 
        userId, 
        amount: { lt: 0 }, 
        ...dateFilter 
      }, 
      _sum: { amount: true } 
    });
    
    const fmt = (d) => new Date(d).toISOString().slice(0,7);
    const incMap = {};
    income.forEach(r => { const k = fmt(r.date); incMap[k] = (incMap[k] || 0) + Number(r._sum.amount || 0); });
    const expMap = {};
    expense.forEach(r => { const k = fmt(r.date); expMap[k] = (expMap[k] || 0) + Math.abs(Number(r._sum.amount || 0)); });
    const months = Array.from(new Set([...Object.keys(incMap), ...Object.keys(expMap)])).sort();
    
    // Apply limit if specified (for performance with large datasets)
    const limitedMonths = limit ? months.slice(-parseInt(limit)) : months;
    
    const rows = limitedMonths.map(m => ({ 
      month: m, 
      income: incMap[m] || 0, 
      expense: expMap[m] || 0 
    }));
    
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


