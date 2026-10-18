// Make sure to import your Prisma client at the top
import prisma from "../../config/database.js";

export async function saveSchoolData(req, res) {
  try {
    const { 
      name, mobile, address = "", email = "", systemID, reminderDays,
      enableOnboardingMsg, enableReminderMsg, enableCompletionMsg,
      workingStartTime, workingEndTime, enableAttendanceReminder, reminderBeforeMinutes
    } = req.body;

    // 1. Basic Validation
    if (!name || !mobile) {
      return res.status(400).json({
        success: false,
        message: "School name and mobile are required.",
      });
    }

    let checkSetUpIsExist = await prisma.setupChecklist.findFirst();
    if (!checkSetUpIsExist) {
      checkSetUpIsExist = await prisma.setupChecklist.create({
        data: {},
      });
    }

    // 2. Check if ANY school record exists
    let existingSchool = await prisma.schoolSetUp.findFirst();

    let schoolRecord;

    if (existingSchool) {
      // 3a. If it exists, UPDATE the existing record using its ID
      schoolRecord = await prisma.schoolSetUp.update({
        where: { id: existingSchool.id },
        data: {
          school_name: name,
          contact_Number: mobile,
          address: address || existingSchool.address,
          support_Email: email || existingSchool.support_Email,
          ...(systemID && { systemID }),
          ...(reminderDays !== undefined && { reminderDays: parseInt(reminderDays, 10) }),
          ...(enableOnboardingMsg !== undefined && { enableOnboardingMsg: Boolean(enableOnboardingMsg) }),
          ...(enableReminderMsg !== undefined && { enableReminderMsg: Boolean(enableReminderMsg) }),
          ...(enableCompletionMsg !== undefined && { enableCompletionMsg: Boolean(enableCompletionMsg) }),
          ...(workingStartTime !== undefined && { workingStartTime: String(workingStartTime) }),
          ...(workingEndTime !== undefined && { workingEndTime: String(workingEndTime) }),
          ...(enableAttendanceReminder !== undefined && { enableAttendanceReminder: Boolean(enableAttendanceReminder) }),
          ...(reminderBeforeMinutes !== undefined && { reminderBeforeMinutes: parseInt(reminderBeforeMinutes, 10) }),
        },
      });
    } else {
      // 3b. If it does not exist, CREATE the first and only record
      schoolRecord = await prisma.schoolSetUp.create({
        data: {
          school_name: name,
          contact_Number: mobile,
          address: address,
          support_Email: email,
          systemID: systemID || null,
          ...(reminderDays !== undefined && { reminderDays: parseInt(reminderDays, 10) }),
          ...(enableOnboardingMsg !== undefined && { enableOnboardingMsg: Boolean(enableOnboardingMsg) }),
          ...(enableReminderMsg !== undefined && { enableReminderMsg: Boolean(enableReminderMsg) }),
          ...(enableCompletionMsg !== undefined && { enableCompletionMsg: Boolean(enableCompletionMsg) }),
          ...(workingStartTime !== undefined && { workingStartTime: String(workingStartTime) }),
          ...(workingEndTime !== undefined && { workingEndTime: String(workingEndTime) }),
          ...(enableAttendanceReminder !== undefined && { enableAttendanceReminder: Boolean(enableAttendanceReminder) }),
          ...(reminderBeforeMinutes !== undefined && { reminderBeforeMinutes: parseInt(reminderBeforeMinutes, 10) }),
        },
      });
    }

    // FIX 2: Update setupChecklist model, not schoolSetUp
    const result = await prisma.setupChecklist.update({
      where: { id: checkSetUpIsExist.id },
      data: {
        schoolSetup: true,
      },
    });

    // 4. Send success response
    return res.status(200).json({
      success: true,
      message: existingSchool
        ? "School data updated successfully!"
        : "School data created successfully!",
      data: schoolRecord,
    });
  } catch (error) {
    console.error("Prisma error saving school data:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while saving the data.",
      error: error.message,
    });
  }
}

export async function getSchoolData(req, res) {
  try {
    const schoolRecord = await prisma.schoolSetUp.findFirst();
    return res.status(200).json({ success: true, data: schoolRecord });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
