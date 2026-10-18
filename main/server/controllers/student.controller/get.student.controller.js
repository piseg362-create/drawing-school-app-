import prisma from "../../config/database.js";

export async function getAllStudents(req, res) {
  try {
    // Get pagination values from query
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const search = req.query.search || "";

    const skip = (page - 1) * limit;
    
    // Create where clause
    const where = search ? {
      OR: [
        { name: { contains: search } },
        { mobile: { contains: search } }
      ]
    } : {};

    // Get total number of students
    const totalStudents = await prisma.student.count({ where });

    // Get students for current page
    // Get students for current page
    const students = await prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
     
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
          },
        },
        car: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Pagination calculations
    const totalPages = Math.ceil(totalStudents / limit);

    return res.status(200).json({
      status: true,
      message: "Students fetched successfully",

      pagination: {
        currentPage: page,
        limit,
        totalStudents,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },

      data: students,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      status: false,
      message: error.message || "Something went wrong",
    });
  }
}
