import prisma from "../../config/database.js";

export async function deleteInstructor(req, res) {
  try {
    const { id } = req.params;
    await prisma.instructor.delete({
      where: { id }
    });
    return res.status(200).json({ success: true, message: "Instructor deleted successfully" });
  } catch (error) {
    console.error("Delete Instructor Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
