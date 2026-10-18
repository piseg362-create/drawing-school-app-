import prisma, { als } from "../../config/database.js";

export const getSettings = async (req, res) => {
  try {
    let token = await prisma.whatsAppToken.findFirst();
    if (!token) {
      token = await als.run('__BYPASS_TENANT__', () => prisma.whatsAppToken.findFirst());
    }
    if (!token) return res.status(404).json({ status: false, message: "Not setup" });
    
    // Calculate current month's actual Meta API spend
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthMessages = await prisma.messageQueue.findMany({
      where: {
        status: "SENT",
        sentAt: { gte: startOfMonth }
      },
      select: {
        template: {
          select: { category: true }
        }
      }
    });

    const utilityRate = token.utilityRate != null ? Number(token.utilityRate) : 0.15;
    const MARKETING_RATE = 0.80;
    let monthSpend = 0;
    for (const msg of monthMessages) {
      if (msg.template?.category === "MARKETING") monthSpend += MARKETING_RATE;
      else monthSpend += utilityRate;
    }

    const monthlyBudget = Number(token.monthlyBudget) || 150.0;
    const budgetReached = Boolean(token.safeMode) && monthSpend >= monthlyBudget;

    return res.status(200).json({
      status: true,
      data: {
        safeMode: Boolean(token.safeMode),
        switchOffMode: Boolean(token.switchOffMode),
        defaultLanguage: token.defaultLanguage || "en",
        monthlyBudget,
        utilityRate,
        currentMonthSpend: Number(monthSpend.toFixed(2)),
        monthSentCount: monthMessages.length,
        budgetReached,
      }
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: "Server error" });
  }
};

export const updateSettings = async (req, res) => {
  try {
    let token = await prisma.whatsAppToken.findFirst();
    if (!token) {
      token = await als.run('__BYPASS_TENANT__', () => prisma.whatsAppToken.findFirst());
    }
    if (!token) return res.status(404).json({ status: false, message: "Not setup" });
    
    const updateData = {};
    if (safeMode !== undefined) updateData.safeMode = Boolean(safeMode);
    if (switchOffMode !== undefined) updateData.switchOffMode = Boolean(switchOffMode);
    if (defaultLanguage !== undefined) updateData.defaultLanguage = String(defaultLanguage);
    if (monthlyBudget !== undefined) updateData.monthlyBudget = Math.max(0, Number(monthlyBudget));
    if (utilityRate !== undefined) updateData.utilityRate = Math.max(0.01, Number(utilityRate));

    const updated = await prisma.whatsAppToken.update({
      where: { id: token.id },
      data: updateData
    });
    
    return res.status(200).json({
      status: true,
      message: "Settings updated",
      data: {
        safeMode: updated.safeMode,
        switchOffMode: Boolean(updated.switchOffMode),
        defaultLanguage: updated.defaultLanguage,
        monthlyBudget: Number(updated.monthlyBudget) || 150.0,
        utilityRate: Number(updated.utilityRate) || 0.15
      }
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: "Server error" });
  }
};
