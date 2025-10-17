import prisma from "../config/prisma.js";

export async function listRecurring(req, res) {
  try {
    const { userId } = req.params;
    const rows = await prisma.recurring.findMany({ where: { userId }, orderBy: [{ nextDate: "asc" }, { id: "asc" }] });
    return res.status(200).json(rows);
  } catch (e) {
    console.log("Error list recurring", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function createRecurring(req, res) {
  try {
    const { userId } = req.params;
    const { title, amount, type, category, repeat_interval = 'monthly', next_date, notes } = req.body;
    if (!title || amount === undefined || !type || !category || !next_date) {
      return res.status(400).json({ message: "title, amount, type, category, next_date required" });
    }
    const row = await prisma.recurring.create({ data: {
      userId,
      title,
      amount,
      type,
      category,
      repeatInterval: repeat_interval,
      nextDate: new Date(next_date),
      notes: notes || null,
    }});
    return res.status(201).json(row);
  } catch (e) {
    console.log("Error create recurring", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateRecurring(req, res) {
  try {
    const { id } = req.params;
    const { title, amount, type, category, repeat_interval, next_date, notes } = req.body;
    const data = {
      ...(title !== undefined ? { title } : {}),
      ...(amount !== undefined ? { amount } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(repeat_interval !== undefined ? { repeatInterval: repeat_interval } : {}),
      ...(next_date !== undefined ? { nextDate: new Date(next_date) } : {}),
      ...(notes !== undefined ? { notes } : {}),
    };
    if (!Object.keys(data).length) return res.status(400).json({ message: "No fields" });
    const row = await prisma.recurring.update({ where: { id: Number(id) }, data }).catch(() => null);
    if (!row) return res.status(404).json({ message: "Not found" });
    return res.status(200).json(row);
  } catch (e) {
    console.log("Error update recurring", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteRecurring(req, res) {
  try {
    const { id } = req.params;
    const row = await prisma.recurring.delete({ where: { id: Number(id) } }).catch(() => null);
    if (!row) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ message: "Deleted" });
  } catch (e) {
    console.log("Error delete recurring", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function materializeCurrentMonth(req, res) {
  try {
    const { userId } = req.params;
    const now = new Date();
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    const recurringRows = await prisma.recurring.findMany({ where: { userId, nextDate: { lte: endDate } } });

    const inserted = [];
    for (const r of recurringRows) {
      const nextDate = new Date(r.nextDate);
      if (nextDate < startDate || nextDate > endDate) continue;

      // Idempotency: avoid duplicate materialization for same user/date/title/amount
      const existing = await prisma.transaction.findFirst({
        where: {
          userId,
          title: r.title,
          amount: r.amount,
          category: r.category,
          type: r.type,
          date: nextDate,
        },
        select: { id: true },
      });
      if (existing) {
        // still advance nextDate forward to the next occurrence
        const advanced = advanceNextDate(nextDate, r.repeatInterval);
        await prisma.recurring.update({ where: { id: r.id }, data: { nextDate: advanced } });
        continue;
      }

      const ins = await prisma.transaction.create({
        data: {
          userId,
          title: r.title,
          amount: r.amount,
          category: r.category,
          type: r.type,
          date: nextDate,
          status: 'completed',
          notes: r.notes || null,
        },
      });
      inserted.push(ins);

      // advance to the next occurrence based on repeatInterval
      const nextOccurrence = advanceNextDate(nextDate, r.repeatInterval);
      await prisma.recurring.update({ where: { id: r.id }, data: { nextDate: nextOccurrence } });
    }
    return res.status(200).json({ inserted: inserted.length });
  } catch (e) {
    console.log("Error materialize", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Helper: compute next date based on repeat interval while staying at UTC midnight
function advanceNextDate(currentDate, repeatInterval) {
  const d = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate()));
  switch ((repeatInterval || 'monthly').toLowerCase()) {
    case 'daily':
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case 'yearly':
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
    case 'monthly':
    default: {
      const targetMonth = d.getUTCMonth() + 1;
      const targetYear = d.getUTCFullYear() + Math.floor(targetMonth / 12);
      const month = (targetMonth % 12);
      // Preserve day-of-month but clamp to end of month if needed
      const day = d.getUTCDate();
      const endOfTargetMonth = new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate();
      const clampedDay = Math.min(day, endOfTargetMonth);
      return new Date(Date.UTC(targetYear, month, clampedDay));
    }
  }
  return d;
}


