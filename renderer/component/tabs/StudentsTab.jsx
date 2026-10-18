"use client";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../component/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../component/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../component/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Button } from "../../components/ui/button";
import { Calendar } from "../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Car, Send } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { toast } from "sonner";
import { StudentProfile } from "./StudentProfile";
import { SendLicenseTestModal } from "./SendLicenseTestModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function StudentsTab() {
  const { t } = useTranslation();

  // Step State
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Dialog Open/Close State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState({
    open: false,
    title: "",
    message: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    package_name: "", // removed default value to force selection
    packageId: "",
    Assigned_Instructor: "",
    instructorId: "",
    Assigned_car_name: "",
    Assigned_car_id: "",
    Total_amount: "",
    Amount_paid: "",
    Enrollment_status: "Pending",
    startDate: "",
    batch_time: "",
    reminderDate: "",
  });

  const [isReminderCalendarOpen, setIsReminderCalendarOpen] = useState(false);
  const [licenseTestStudent, setLicenseTestStudent] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const queryClient = useQueryClient();

  // Updated state to handle data and pagination structure using TanStack Query
  const {
    data: student = {
      data: [],
      pagination: {
        currentPage: 1,
        limit: 10,
        totalStudents: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
    isLoading: isStudentLoading,
  } = useQuery({
    queryKey: ["students", searchTerm],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append("search", searchTerm);
      const res = await fetchApi(`/get-student-data?${queryParams.toString()}`);
      const data = await res.json();
      return {
        data: data.data || [],
        pagination: data.pagination || {},
      };
    },
  });

  const nextStep = () => {
    // Validation
    if (step === 1) {
      if (!formData.name || !formData.mobile) {
        setAlertInfo({
          open: true,
          title: "Missing Details",
          message: "Please fill all details (Name, Mobile).",
        });
        return;
      }
    } else if (step === 2) {
      if (
        !formData.package_name ||
        !formData.Assigned_Instructor ||
        !formData.Assigned_car_name
      ) {
        setAlertInfo({
          open: true,
          title: "Missing Selection",
          message: "Please select Package, Instructor, and Car.",
        });
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, totalSteps));
  };
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  // Handle Dialog open/close & reset steps on close
  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(() => setStep(1), 300); // slight delay to allow closing animation
      setIsEditing(false);
      setEditId(null);
      setFormData({
        name: "",
        mobile: "",
        package_name: "",
        packageId: "",
        Assigned_Instructor: "",
        instructorId: "",
        Assigned_car_name: "",
        Assigned_car_id: "",
        Total_amount: "",
        Amount_paid: "",
        Enrollment_status: "Pending",
        startDate: "",
        batch_time: "",
      });
    }
  };

  // Generic handler for standard text/number inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handler for basic Shadcn Select components (like Enrollment Status)
  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const [supportData, setSupportData] = useState({
    packages: [],
    instructors: [],
    cars: [],
  });

  // Fetch Support Data on component mount
  useEffect(() => {
    const loadSupportData = async () => {
      try {
        const res = await fetchApi("/support-data");
        const resData = await res.json();

        if (res.status === 200 || resData?.status === 200) {
          setSupportData({
            packages: resData?.data?.existingPackage || [],
            instructors: resData?.data?.existingInstructor || [],
            cars: resData?.data?.existCar || [],
          });
        }
      } catch (error) {
        console.error("Failed to fetch support data:", error);
      }
    };

    if (isOpen) {
      loadSupportData();
    }
  }, [isOpen]);

  // Handle final submission using TanStack Mutation
  const addStudentMutation = useMutation({
    mutationFn: async (newStudent) => {
      const url = isEditing ? `/update-student/${editId}` : "/create-student";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetchApi(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStudent),
      });
      if (!res.ok) {
        throw new Error(
          res.message || `Failed to ${isEditing ? "update" : "create"} student`,
        );
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(
        data.message ||
          `Student ${isEditing ? "updated" : "created"} successfully`,
      );
      handleOpenChange(false);
      setFormData({
        name: "",
        mobile: "",
        package_name: "",
        packageId: "",
        Assigned_Instructor: "",
        instructorId: "",
        Assigned_car_name: "",
        Assigned_car_id: "",
        Total_amount: "",
        Amount_paid: "",
        Enrollment_status: "Pending",
        startDate: "",
        batch_time: "",
        reminderDate: "",
      });
      // Invalidate queries to automatically refetch student and schedule data
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["instructors"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEditStudent = (item) => {
    setFormData({
      name: item.name || "",
      mobile: item.mobile || "",
      package_name: item.package_name || "",
      packageId: item.packageId || "",
      Assigned_Instructor:
        item.instructor?.name || item.Assigned_Instructor || "",
      instructorId: item.instructorId || "",
      Assigned_car_name: item.car?.name || "",
      Assigned_car_id: item.Assigned_car_id || "",
      Total_amount: item.Total_amount || "",
      Amount_paid: item.Amount_paid || "",
      Enrollment_status: item.Enrollment_status || "Pending",
      startDate: item.Course_Start_date
        ? new Date(item.Course_Start_date).toISOString().split("T")[0]
        : "",
      batch_time: item.batch_time || "",
    });
    setEditId(item.id);
    setIsEditing(true);
    setStep(1);
    setIsOpen(true);
  };

  const handleDeleteStudent = async (id) => {
    if (confirm("Are you sure you want to delete this student?")) {
      try {
        const res = await fetchApi(`/delete-student/${id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Student deleted successfully");
          queryClient.invalidateQueries({ queryKey: ["students"] });
        } else {
          toast.error(data.message || "Failed to delete student");
        }
      } catch (err) {
        toast.error("Error deleting student");
      }
    }
  };

  const str = localStorage.getItem("user");
  const parse = JSON.parse(str);

  const systemId = parse.userId;

  const handleSaveStudent = () => {
    addStudentMutation.mutate({ ...formData, systemId });
  };

  // Helpers for dynamic styling
  const avatarColors = [
    "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
    "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300",
    "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300",
    "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300",
    "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300",
  ];

  const getStatusColor = (status) => {
    const s = status?.toUpperCase() || "";
    if (s === "ACTIVE" || s === "CHOSEN")
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50";
    if (s === "COMPLETED")
      return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50";
    return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/50";
  };

  const getInitials = (name) => {
    if (!name) return "UN";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Pagination calculation
  const {
    currentPage = 1,
    limit = 10,
    totalStudents = 0,
  } = student.pagination || {};
  const startRecord = totalStudents === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endRecord = Math.min(currentPage * limit, totalStudents);

  if (selectedStudent) {
    return (
      <StudentProfile
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
        onUpdate={(updatedStudent) => {
          setSelectedStudent(updatedStudent);
          setStudent((prev) => ({
            ...prev,
            data: prev.data.map((s) =>
              s.id === updatedStudent.id ? updatedStudent : s,
            ),
          }));
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm transition-colors duration-300">
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <input
            type="text"
            placeholder={t("Search students...")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full sm:w-64 bg-gray-50 dark:bg-[#171a22] border border-gray-300 dark:border-[#3a3d45] rounded-lg px-4 py-2 text-gray-900 dark:text-[#f2e9de] placeholder-gray-400 dark:placeholder-[#5a5f6e] focus:outline-none focus:border-[#c1552c] focus:ring-1 focus:ring-[#c1552c] transition-colors"
          />
        </div>

        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <button className="bg-[#c1552c] hover:bg-[#a64724] text-white font-medium rounded-lg px-5 py-2 transition-colors duration-200 shadow-md shadow-[#c1552c]/20 flex items-center space-x-2">
              <span>+ {t("Add Student")}</span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl transition-all duration-300">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Edit Student" : "Add New Student"}
              </DialogTitle>
              <DialogDescription>
                Step {step} of {totalSteps}:{" "}
                {step === 1
                  ? "Personal Details"
                  : step === 2
                    ? "Assignment Details"
                    : "Payment & Status"}
              </DialogDescription>
            </DialogHeader>

            {/* Stepper Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-[#3a3d45] rounded-full h-1.5 mt-2 mb-4">
              <div
                className="bg-[#c1552c] h-1.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              ></div>
            </div>

            {/* Form Steps */}
            <div className="min-h-[220px] py-2 relative">
              {/* STEP 1: Personal Information */}
              {step === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                  <div className="space-y-2">
                    <label
                      htmlFor="name"
                      className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]"
                    >
                      Full Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      placeholder="E.g. Jane Doe"
                      onChange={handleChange}
                      value={formData.name}
                      className="flex h-10 w-full rounded-md border border-gray-300 dark:border-[#3a3d45] bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-[#f2e9de] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c1552c]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="mobile"
                      className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]"
                    >
                      Mobile Number
                    </label>
                    <input
                      id="mobile"
                      name="mobile"
                      placeholder="+91 9876543210"
                      onChange={handleChange}
                      value={formData.mobile}
                      className="flex h-10 w-full rounded-md border border-gray-300 dark:border-[#3a3d45] bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-[#f2e9de] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c1552c]"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Package & Assignments */}
              {step === 2 && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-right-4 fade-in duration-300">
                  <div className="space-y-2 col-span-2 relative z-30">
                    <label className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]">
                      Select Package
                    </label>
                    <Select
                      value={formData.package_name}
                      onValueChange={(val) => {
                        const selectedPackage = supportData.packages.find(
                          (p) => p.name === val,
                        );

                        setFormData((prev) => ({
                          ...prev,
                          package_name: val,
                          packageId: selectedPackage ? selectedPackage.id : "",
                          Total_amount: selectedPackage
                            ? selectedPackage.price
                            : "",
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a package..." />
                      </SelectTrigger>
                      <SelectContent>
                        {supportData.packages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.name}>
                            {pkg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 col-span-2 sm:col-span-1 relative z-20">
                    <label className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]">
                      Assigned Instructor
                    </label>
                    <Select
                      value={formData.Assigned_Instructor}
                      onValueChange={(val) => {
                        const selectedInstructor = supportData.instructors.find(
                          (i) => i.name === val,
                        );
                        setFormData((prev) => ({
                          ...prev,
                          Assigned_Instructor: val,
                          instructorId: selectedInstructor
                            ? selectedInstructor.id
                            : "",
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Instructor" />
                      </SelectTrigger>
                      <SelectContent>
                        {supportData.instructors.map((instructor) => (
                          <SelectItem
                            key={instructor.id}
                            value={instructor.name}
                          >
                            {instructor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2 sm:col-span-1 relative z-10">
                    <label className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]">
                      Assigned Car
                    </label>
                    <Select
                      value={formData.Assigned_car_name}
                      onValueChange={(val) => {
                        const selectedCar = supportData.cars.find(
                          (c) => (c.model || c.name) === val,
                        );
                        setFormData((prev) => ({
                          ...prev,
                          Assigned_car_name: val,
                          Assigned_car_id: selectedCar ? selectedCar.id : "",
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Car" />
                      </SelectTrigger>
                      <SelectContent>
                        {supportData.cars.map((car) => {
                          const carName = car.model || car.name;
                          return (
                            <SelectItem key={car.id} value={carName}>
                              {carName}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* STEP 3: Payment & Status */}
              {step === 3 && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-right-4 fade-in duration-300">
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <label
                      htmlFor="Total_amount"
                      className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]"
                    >
                      Total Amount (₹)
                    </label>
                    <input
                      id="Total_amount"
                      name="Total_amount"
                      type="number"
                      placeholder="0.00"
                      value={formData.Total_amount}
                      disabled
                      readOnly
                      className="flex h-10 w-full rounded-md border border-gray-200 dark:border-[#3a3d45] bg-gray-50 dark:bg-[#171a22] px-3 py-2 text-sm text-gray-500 dark:text-[#8a8d96] cursor-not-allowed focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <label
                      htmlFor="Amount_paid"
                      className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]"
                    >
                      Amount Paid (₹)
                    </label>
                    <input
                      id="Amount_paid"
                      name="Amount_paid"
                      type="number"
                      placeholder="0.00"
                      onChange={handleChange}
                      value={formData.Amount_paid}
                      className="flex h-10 w-full rounded-md border border-gray-300 dark:border-[#3a3d45] bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-[#f2e9de] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c1552c]"
                    />
                  </div>

                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <label
                      htmlFor="startDate"
                      className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]"
                    >
                      Course Starting Date
                    </label>
                    <Popover
                      open={isCalendarOpen}
                      onOpenChange={setIsCalendarOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal border-gray-300 dark:border-[#3a3d45] bg-transparent text-gray-900 dark:text-[#f2e9de] hover:bg-gray-50 dark:hover:bg-[#2c3242] focus:ring-2 focus:ring-[#c1552c] ${!formData.startDate && "text-gray-400 dark:text-gray-500"}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.startDate ? (
                            format(new Date(formData.startDate), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            formData.startDate
                              ? new Date(formData.startDate)
                              : undefined
                          }
                          onSelect={(date) => {
                            handleChange({
                              target: {
                                name: "startDate",
                                value: date ? format(date, "yyyy-MM-dd") : "",
                              },
                            });
                            setIsCalendarOpen(false);
                          }}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2 col-span-2 sm:col-span-1 relative z-30">
                    <label className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]">
                      Batch Time
                    </label>
                    <Select
                      value={formData.batch_time}
                      onValueChange={(val) =>
                        handleSelectChange("batch_time", val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select batch time" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "09:00 AM - 10:00 AM",
                          "10:00 AM - 11:00 AM",
                          "11:00 AM - 12:00 PM",
                          "12:00 PM - 01:00 PM",
                          "01:00 PM - 02:00 PM",
                          "02:00 PM - 03:00 PM",
                          "03:00 PM - 04:00 PM",
                          "04:00 PM - 05:00 PM",
                          "05:00 PM - 06:00 PM",
                          "06:00 PM - 07:00 PM",
                          "07:00 PM - 08:00 PM",
                          "08:00 PM - 09:00 PM",
                        ].map((timeSlot) => (
                          <SelectItem key={timeSlot} value={timeSlot}>
                            {timeSlot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between items-center sm:justify-between pt-4 mt-2 border-t border-gray-100 dark:border-[#2c3242]">
              <div>
                {step > 1 ? (
                  <button
                    onClick={prevStep}
                    className="px-4 py-2 border border-gray-300 dark:border-[#3a3d45] text-gray-700 dark:text-[#cfd3da] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2c3242] transition-colors text-sm font-medium"
                  >
                    Back
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenChange(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-[#3a3d45] text-gray-700 dark:text-[#cfd3da] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2c3242] transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div>
                {step < totalSteps ? (
                  <button
                    onClick={nextStep}
                    className="px-6 py-2 bg-[#1e222d] dark:bg-gray-700 text-white rounded-lg hover:bg-black dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleSaveStudent}
                    className="px-6 py-2 bg-[#c1552c] text-white rounded-lg hover:bg-[#a64724] transition-colors shadow-sm shadow-[#c1552c]/20 text-sm font-medium"
                  >
                    {isEditing ? "Update Student" : "Save Student"}
                  </button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* API Data Mapped Table */}
      <div className="bg-white dark:bg-[#1e222d] rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm overflow-hidden transition-colors duration-300">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 dark:bg-[#171a22]/50 hover:bg-gray-50/50 dark:hover:bg-[#171a22]/50">
              <TableHead>{t("Student Name")}</TableHead>
              <TableHead>{t("Contact (Mobile)")}</TableHead>
              <TableHead>{t("Package Info")}</TableHead>
              <TableHead>{t("Instructor & Car")}</TableHead>
              <TableHead>{t("Fees / Payments")}</TableHead>
              <TableHead>{t("Enrollment Status")}</TableHead>
              <TableHead className="text-right">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {student.data.length > 0 ? (
              student.data.map((item, i) => (
                <TableRow
                  key={item.id || i}
                  className="group cursor-pointer hover:bg-gray-50/50 dark:hover:bg-[#252a38]/50"
                  onClick={() => setSelectedStudent(item)}
                >
                  {/* Name & Dynamic Initial/Color */}
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${avatarColors[i % avatarColors.length]}`}
                      >
                        {getInitials(item.name)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-[#f2e9de] group-hover:text-[#c1552c] transition-colors capitalize">
                          {item.name}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Mobile */}
                  <TableCell>
                    <div className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]">
                      {item.mobile || "N/A"}
                    </div>
                  </TableCell>

                  {/* Package ID & Name */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-[#f2e9de]">
                        {item.package_name || "N/A"}
                      </span>
                      {item.packageId && (
                        <span
                          className="text-xs text-gray-500 dark:text-[#8a8d96] truncate max-w-[120px]"
                          title={item.packageId}
                        >
                          ID: {item.packageId.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Instructor & Car */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-[#f2e9de] capitalize">
                        {item.instructor?.name || "Not Assigned"}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-[#8a8d96]">
                        {t("Car")}:{" "}
                        {item.car?.name || item.Assigned_car_id || "Pending"}
                      </span>
                    </div>
                  </TableCell>

                  {/* Fees / Payments */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="text-xs text-gray-500 dark:text-[#8a8d96]">
                        {t("Total")}:{" "}
                        <span className="font-medium text-gray-900 dark:text-[#f2e9de]">
                          ₹{item.Total_amount ?? "0"}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-[#c1552c]">
                        {t("Paid")}: ₹
                        {item.Amount_paid
                          ? Number(item.Amount_paid).toFixed(2)
                          : "0.00"}
                      </div>
                      {item.remaining_amount !== undefined && (
                        <div className="text-xs text-gray-500 dark:text-[#8a8d96]">
                          {t("Due")}:{" "}
                          <span className="font-medium text-gray-900 dark:text-[#f2e9de]">
                            ₹{item.remaining_amount}
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Dynamic Enrollment Status */}
                  <TableCell>
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full border uppercase ${getStatusColor(item.Enrollment_status)}`}
                    >
                      {item.Enrollment_status
                        ? t(item.Enrollment_status.toUpperCase())
                        : t("PENDING")}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setLicenseTestStudent(item)}
                        title={item.licenseTestDate ? `License Test: ${new Date(item.licenseTestDate).toLocaleDateString()}` : "Schedule & Send License Test Date"}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          item.licenseTestDate
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-orange-50 hover:bg-orange-100 text-[#c1552c] dark:bg-[#c1552c]/15 dark:hover:bg-[#c1552c]/30 border border-orange-200/60 dark:border-[#c1552c]/40"
                        }`}
                      >
                        <Car className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">{item.licenseTestDate ? "Test Set" : "Test Date"}</span>
                      </button>

                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-gray-400 hover:text-[#c1552c] dark:text-[#8a8d96] dark:hover:text-[#c1552c] rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all focus:outline-none"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 13a1 1 0 100-2 1 1 0 000 2zm0-5a1 1 0 100-2 1 1 0 000 2zm0 10a1 1 0 100-2 1 1 0 000 2z"></path>
                            </svg>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-1" align="end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLicenseTestStudent(item);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-md transition-colors flex items-center gap-2"
                          >
                            <Car className="w-4 h-4" />
                            <span>License Test</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditStudent(item);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-[#cfd3da] hover:bg-gray-100 dark:hover:bg-[#2c3242] rounded-md transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStudent(item.id);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          >
                            Delete
                          </button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-gray-500 dark:text-gray-400"
                >
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Dynamic Pagination Footer */}
        <div className="bg-gray-50 dark:bg-[#171a22] px-6 py-4 border-t border-gray-200 dark:border-[#2c3242] flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500 dark:text-[#8a8d96]">
            Showing{" "}
            <span className="text-gray-900 dark:text-[#f2e9de]">
              {startRecord}
            </span>{" "}
            to{" "}
            <span className="text-gray-900 dark:text-[#f2e9de]">
              {endRecord}
            </span>{" "}
            of{" "}
            <span className="text-gray-900 dark:text-[#f2e9de]">
              {totalStudents}
            </span>{" "}
            students
          </span>
          <div className="flex space-x-2">
            <button
              className="px-4 py-1.5 border border-gray-300 dark:border-[#3a3d45] rounded-lg text-sm font-medium text-gray-600 dark:text-[#cfd3da] hover:bg-gray-100 dark:hover:bg-[#2c3242] transition-colors disabled:opacity-50"
              disabled={!student.pagination?.hasPreviousPage}
            >
              Previous
            </button>
            <button
              className="px-4 py-1.5 border border-gray-300 dark:border-[#3a3d45] rounded-lg text-sm font-medium text-gray-600 dark:text-[#cfd3da] hover:bg-gray-100 dark:hover:bg-[#2c3242] transition-colors shadow-sm disabled:opacity-50"
              disabled={!student.pagination?.hasNextPage}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* License Test Notification Modal */}
      {licenseTestStudent && (
        <SendLicenseTestModal
          isOpen={Boolean(licenseTestStudent)}
          student={licenseTestStudent}
          onClose={() => setLicenseTestStudent(null)}
          onSent={() => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
          }}
        />
      )}

      <AlertDialog
        open={alertInfo.open}
        onOpenChange={(open) => setAlertInfo((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertInfo.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertInfo.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setAlertInfo((prev) => ({ ...prev, open: false }))}
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
