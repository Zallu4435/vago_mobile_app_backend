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
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const recurringRows = await prisma.recurring.findMany({ where: { userId, nextDate: { lte: new Date(end) } } });

    const inserted = [];
    for (const r of recurringRows) {
      const date = r.next_date;
      if (date < start || date > end) continue;
      const title = r.title;
      const amount = r.amount;
      const category = r.category;
      const type = r.type;
      const status = 'completed';
      const ins = await prisma.transaction.create({ data: {
        userId,
        title,
        amount,
        category,
        type,
        date: new Date(date),
        status,
        notes: r.notes || null,
      }});
      inserted.push(ins);
      // push next_date by 1 month for monthly
      const nd = new Date(date);
      nd.setMonth(nd.getMonth() + 1);
      const next = nd.toISOString().slice(0, 10);
      await prisma.recurring.update({ where: { id: r.id }, data: { nextDate: new Date(next) } });
    }
    return res.status(200).json({ inserted: inserted.length });
  } catch (e) {
    console.log("Error materialize", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}


