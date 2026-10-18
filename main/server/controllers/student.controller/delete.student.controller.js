import prisma from "../../config/database.js";

export async function deleteStudent(req, res) {
  try {
    const { id } = req.params;
    await prisma.student.delete({
      where: { id }
    });
    return res.status(200).json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    console.error("Delete Student Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
