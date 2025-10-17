import prisma from "../config/prisma.js";

export async function getProfile(req, res) {
  try {
    const { userId } = req.params;
    const row = await prisma.userProfile.findUnique({ where: { userId } });
    return res.status(200).json(row || null);
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
    return res.status(200).json(saved);
  } catch (e) {
    console.log("Error upsert profile", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}


