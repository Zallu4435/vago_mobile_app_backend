import prisma from "../config/prisma.js";

export async function getTransactionsByUserId(req, res) {
  try {
    const { userId } = req.params;
    const { 
      status, 
      type, 
      category, 
      startDate, 
      endDate, 
      sort, 
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Build where clause
    const where = {
      userId,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
      ...(startDate || endDate
        ? { 
            date: { 
              gte: startDate ? new Date(startDate) : undefined, 
              lte: endDate ? new Date(endDate) : undefined 
            } 
          }
        : {}),
      // Add search functionality (only if search has non-whitespace chars)
      ...(search && search.trim() ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } }
        ]
      } : {}),
    };

    // Build order by clause
    let orderBy;
    switch (sort) {
      case "latest":
      case "date_desc":
        orderBy = [{ date: "desc" }, { id: "desc" }];
        break;
      case "oldest":
      case "date_asc":
        orderBy = [{ date: "asc" }, { id: "asc" }];
        break;
      case "amount_desc":
        orderBy = [{ amount: "desc" }, { date: "desc" }];
        break;
      case "amount_asc":
        orderBy = [{ amount: "asc" }, { date: "desc" }];
        break;
      case "status":
        orderBy = [{ status: "asc" }, { date: "desc" }];
        break;
      default:
        orderBy = [{ date: "desc" }, { id: "desc" }];
    }

    // Parse pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await prisma.transaction.count({ where });

    // Get paginated transactions
    const transactions = await prisma.transaction.findMany({ 
      where, 
      orderBy,
      skip,
      take: limitNum
    });

    // Return paginated response
    res.status(200).json({
      transactions,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      hasMore: skip + transactions.length < totalCount
    });
  } catch (error) {
    console.log("Error getting the transactions", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createTransaction(req, res) {
  try {
    const { title, amount, category, user_id, type, date, status, notes } = req.body;

    if (!title || !user_id || !category || amount === undefined) {
      return res.status(400).json({ message: "All required fields: title, amount, category, user_id" });
    }

    const normalizedType = type === "income" ? "income" : type === "expense" ? "expense" : (parseFloat(amount) >= 0 ? "income" : "expense");
    const normalizedStatus = ["pending", "completed", "cancelled"].includes(status)
      ? status
      : "completed";

    const transaction = await prisma.transaction.create({
      data: {
        userId: user_id,
        title,
        amount,
        category,
        type: normalizedType,
        date: date ? new Date(date) : new Date(),
        status: normalizedStatus,
        notes: notes || null,
      },
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.log("Error creating the transaction", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteTransaction(req, res) {
  try {
    const { id } = req.params;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const result = await prisma.transaction.delete({ where: { id: Number(id) } }).catch(() => null);

    if (!result) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.status(200).json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.log("Error deleting the transaction", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getSummaryByUserId(req, res) {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const where = {
      userId,
      ...(startDate || endDate
        ? { date: { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined } }
        : {}),
    };

    const [sumAll, sumIncome, sumExpense] = await Promise.all([
      prisma.transaction.aggregate({ _sum: { amount: true }, where }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { ...where, amount: { gt: 0 } } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { ...where, amount: { lt: 0 } } }),
    ]);

    res.status(200).json({
      balance: sumAll._sum.amount || 0,
      income: sumIncome._sum.amount || 0,
      expenses: sumExpense._sum.amount || 0,
    });
  } catch (error) {
    console.log("Error gettin the summary", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateTransaction(req, res) {
  try {
    const { id } = req.params;
    const { title, amount, category, type, date, status, notes } = req.body;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const data = {
      ...(title !== undefined ? { title } : {}),
      ...(amount !== undefined ? { amount } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(date !== undefined ? { date: new Date(date) } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(notes !== undefined ? { notes } : {}),
    };

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const result = await prisma.transaction.update({ where: { id: Number(id) }, data }).catch(() => null);

    if (!result) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.status(200).json(result);
  } catch (error) {
    console.log("Error updating the transaction", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
