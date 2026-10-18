import prisma from "../../config/database.js";

export async function getDemoStatus(req, res) {
  try {
    let demo = await prisma.demoStatus.findFirst({});

    if (!demo) {
      demo = await prisma.demoStatus.create({
        data: {
          isDemo: true,
          startDate: new Date(),
        }
      });
    }

    if (!demo.isDemo) {
      return res.status(200).json({
        success: true,
        isDemo: false,
        isExpired: false,
        remainingDays: 0
      });
    }

    const demoDuration = 15; // days
    const now = new Date();
    const startDate = new Date(demo.startDate);
    
    // calculate diff (for testing: 1 real minute = 3 fake days, so 5 minutes = 15 days)
    const diffTime = now.getTime() - startDate.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffDays = diffMinutes * 3;
    
    let remainingDays = demoDuration - diffDays;
    
    if (remainingDays < 0) {
      remainingDays = 0;
    }

    return res.status(200).json({
      success: true,
      isDemo: demo.isDemo,
      startDate: demo.startDate,
      remainingDays: remainingDays,
      isExpired: remainingDays <= 0
    });
  } catch (error) {
    console.error("Error fetching demo status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
