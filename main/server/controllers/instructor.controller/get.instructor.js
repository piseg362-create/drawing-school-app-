import prisma from "../../config/database.js";

export async function getAllInstructors(req, res) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const search = req.query.search || "";
    
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { name: { contains: search } },
        { mobile: { contains: search } }
      ]
    } : {};

    const totalInstructors = await prisma.instructor.count({ where });

    // 1. Update the query to include the count of related students
    const instructors = await prisma.instructor.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            students: true,
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

    // 2. Optional: Flatten the data so it's easier for the frontend to read
    const formattedInstructors = instructors.map((instructor) => ({
      ...instructor,
      studentCount: instructor._count.students,
      _count: undefined,
    }));

    const totalPages = Math.ceil(totalInstructors / limit);

    return res.status(200).json({
      status: true,
      message: "Instructors fetched successfully",
      pagination: {
        currentPage: page,
        limit,
        totalInstructors,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      data: formattedInstructors, // Send the flattened data
    });
  } catch (error) {
    console.log("Error fetching instructors:", error);

    return res.status(500).json({
      status: false,
      message: error.message || "Something went wrong",
    });
  }
}
