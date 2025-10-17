import prisma from "../config/prisma.js";

export async function getProfile(req, res) {
  try {
    const { userId } = req.params;
    const row = await prisma.userProfile.findUnique({ where: { userId } });
    if (!row) return res.status(200).json(null);
    const out = {
      user_id: row.userId,
      full_name: row.fullName || null,
      avatar_url: row.avatarUrl || null,
      updated_at: row.updatedAt,
    };
    return res.status(200).json(out);
  } catch (e) {
    console.log("Error get profile", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function upsertProfile(req, res) {
  try {
    const { userId } = req.params;
    const { full_name, avatar_url } = req.body;
    const saved = await prisma.userProfile.upsert({
      where: { userId },
      update: { fullName: full_name || null, avatarUrl: avatar_url || null },
      create: { userId, fullName: full_name || null, avatarUrl: avatar_url || null },
    });
    const out = {
      user_id: saved.userId,
      full_name: saved.fullName || null,
      avatar_url: saved.avatarUrl || null,
      updated_at: saved.updatedAt,
    };
    return res.status(200).json(out);
  } catch (e) {
    console.log("Error upsert profile", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}


