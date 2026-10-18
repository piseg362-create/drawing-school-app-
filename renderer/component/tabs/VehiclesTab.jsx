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
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Calendar } from "../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fetchApi } from "@/lib/api";

const INDIAN_CARS = [
  "Maruti Suzuki Swift",
  "Maruti Suzuki Alto",
  "Maruti Suzuki WagonR",
  "Maruti Suzuki Baleno",
  "Hyundai i10",
  "Hyundai i20",
  "Hyundai Creta",
  "Tata Tiago",
  "Tata Punch",
  "Tata Nexon",
  "Mahindra Bolero",
  "Mahindra XUV300",
  "Kia Seltos",
  "Toyota Innova",
  "Honda City",
];

const maintenanceTypes = [
  "OIL_CHANGE", "OIL_FILTER", "AIR_FILTER", "TYRE_CHECK", "TYRE_REPLACEMENT", 
  "BRAKE_CHECK", "BRAKE_PAD_REPLACEMENT", "BATTERY_CHECK", "BATTERY_REPLACEMENT", 
  "ENGINE_CHECK", "COOLANT", "BRAKE_FLUID", "TRANSMISSION_FLUID", "AC_SERVICE", 
  "WHEEL_ALIGNMENT", "WHEEL_BALANCING", "GENERAL_CHECKUP", "REPAIR", "CAR_WASH", "POLISHING"
];

export function VehiclesTab() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const totalSteps = 2;
  const [isOpen, setIsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const [carSelection, setCarSelection] = useState("");
  const [isCustomCar, setIsCustomCar] = useState(false);

  const handleCarSelect = (value) => {
    setCarSelection(value);
    if (value === "Other") {
      setIsCustomCar(true);
      setFormData((prev) => ({ ...prev, name: "" }));
    } else {
      setIsCustomCar(false);
      setFormData((prev) => ({ ...prev, name: value }));
    }
  };
  
  const [alertInfo, setAlertInfo] = useState({
    open: false,
    title: "",
    message: "",
  });
  
  const [formData, setFormData] = useState({
    name: "",
    transmission: "",
    car_Number: "",
    car_year: "",
    maintenanceTypes: [],
    serviceDate: "",
    intervalDays: "",
  });

  const [vehicles, setVehicles] = useState({
    data: [],
    pagination: {
      currentPage: 1,
      limit: 10,
      totalCars: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleMaintenanceType = (type) => {
    setFormData((prev) => {
      const types = prev.maintenanceTypes || [];
      const exists = types.find(t => t.type === type);
      if (exists) {
        return { ...prev, maintenanceTypes: types.filter((t) => t.type !== type) };
      } else {
        const defaultInterval = type === "OIL_CHANGE" ? 90 : type === "CAR_WASH" ? 15 : 180;
        return { ...prev, maintenanceTypes: [...types, { type, intervalDays: defaultInterval }] };
      }
    });
  };

  const updateMaintenanceInterval = (type, interval) => {
    setFormData((prev) => {
      const types = [...(prev.maintenanceTypes || [])];
      const idx = types.findIndex(t => t.type === type);
      if (idx !== -1) {
        types[idx] = { ...types[idx], intervalDays: interval === "" ? "" : parseInt(interval) || 0 };
      }
      return { ...prev, maintenanceTypes: types };
    });
  };

  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(() => setStep(1), 300);
      setFormData({
        name: "",
        transmission: "",
        car_Number: "",
        car_year: "",
        maintenanceTypes: [],
        serviceDate: "",
        intervalDays: "",
      });
      setCarSelection("");
      setIsCustomCar(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.transmission || !formData.car_Number || !formData.car_year) {
        setAlertInfo({
          open: true,
          title: "Missing Details",
          message: "Please fill all details (Name, Transmission, Plate Number, Year).",
        });
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleSaveCar = async () => {
    if (formData.maintenanceTypes.length === 0) {
      setAlertInfo({
        open: true,
        title: "Missing Details",
        message: "Please select at least one Maintenance Type.",
      });
      return;
    }

    try {
      const res = await fetchApi("/create-car", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        toast.error(res.message || "Failed to create vehicle");
        return;
      }

      toast.success(res.message || "Vehicle created successfully");
      handleOpenChange(false);
      fetchCarsData();
    } catch (error) {
      console.error("Failed to save car:", error);
      toast.error("An unexpected error occurred.");
    }
  };

  const fetchCarsData = async () => {
    try {
      const res = await fetchApi("/get-cars");
      const data = await res.json();

      if (data && data.status) {
        setVehicles({
          data: data.data || [],
          pagination: data.pagination || {},
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchCarsData();
  }, []);

  const currentYear = new Date().getFullYear();
  const years = Array.from(new Array(20), (val, index) => currentYear - index);

  const maintenanceCarsCount = vehicles.data.filter(v => v.status === 'Maintenance').length;
  const availableCarsCount = vehicles.data.filter(v => v.status === 'Available').length;

  return (
    <div className="space-y-6">
      {/* Fleet Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1e222d] p-5 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm flex items-center justify-between transition-colors duration-300">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-[#8a8d96] mb-1">Fleet Availability</p>
            <div className="flex items-end space-x-2">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-[#f2e9de]">{availableCarsCount}</h3>
              <span className="text-sm text-gray-500 dark:text-[#8a8d96] mb-1">/ {vehicles.data.length} Available</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e222d] p-5 rounded-xl border border-red-200 dark:border-red-900/30 shadow-sm flex items-center justify-between transition-colors duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-red-500"></div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-[#8a8d96] mb-1">Maintenance Alerts</p>
            <div className="flex items-end space-x-2">
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">{maintenanceCarsCount}</h3>
              <span className="text-sm text-red-500/80 dark:text-red-400/80 mb-1">Needs Service</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m14.28 10.3-4.5 4.5"/><path d="M19.78 15.34A5.5 5.5 0 0 1 12 16L9.66 18.34a2.83 2.83 0 0 1-4-4L8 12a5.5 5.5 0 0 1 .66-7.78 5.5 5.5 0 0 1 7.78.66l2 2a5.5 5.5 0 0 1-.66 8.46Z"/></svg>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm transition-colors duration-300">
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder={t("Search vehicles (make, plate)...")} 
            className="w-full sm:w-64 bg-gray-50 dark:bg-[#171a22] border border-gray-300 dark:border-[#3a3d45] rounded-lg px-4 py-2 text-gray-900 dark:text-[#f2e9de] placeholder-gray-400 dark:placeholder-[#5a5f6e] focus:outline-none focus:border-[#c1552c] focus:ring-1 focus:ring-[#c1552c] transition-colors"
          />
        </div>
        
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <button className="bg-[#c1552c] hover:bg-[#a64724] text-white font-medium rounded-lg px-5 py-2 transition-colors duration-200 shadow-md shadow-[#c1552c]/20 flex items-center space-x-2">
              <span>+ {t("Add Vehicle")}</span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md transition-all duration-300">
            <DialogHeader>
              <DialogTitle>Add Vehicle</DialogTitle>
              <DialogDescription>
                Step {step} of {totalSteps}: {step === 1 ? "Vehicle Details" : "Initial Maintenance Schedule"}
              </DialogDescription>
            </DialogHeader>

            <div className="w-full bg-gray-200 dark:bg-[#3a3d45] rounded-full h-1.5 mt-2 mb-4">
              <div 
                className="bg-[#c1552c] h-1.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              ></div>
            </div>

            <div className="min-h-[250px] py-2 relative">
              {step === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                  <div className="space-y-2 relative z-50">
                    <label className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]">
                      Vehicle Name / Model
                    </label>
                    <Select onValueChange={handleCarSelect} value={carSelection}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a car model" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="grid grid-cols-2 gap-1 p-1 max-h-60 overflow-y-auto">
                          {INDIAN_CARS.map((car) => (
                            <SelectItem key={car} value={car}>
                              {car}
                            </SelectItem>
                          ))}
                          <SelectItem
                            value="Other"
                            className="col-span-2 font-medium border-t border-gray-200 dark:border-[#2c3242] mt-1 pt-2"
                          >
                            Other (Enter manually)
                          </SelectItem>
                        </div>
                      </SelectContent>
                    </Select>
                    
                    {isCustomCar && (
                      <div className="pt-2">
                        <input
                          name="name"
                          placeholder="E.g. Toyota Corolla"
                          onChange={handleChange}
                          value={formData.name}
                          required
                          className="flex h-10 w-full rounded-md border border-gray-300 dark:border-[#3a3d45] bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-[#f2e9de] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c1552c]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]">
                      License Plate Number
                    </label>
                    <input
                      name="car_Number"
                      placeholder="E.g. XYZ-9876"
                      onChange={handleChange}
                      value={formData.car_Number}
                      className="flex h-10 w-full rounded-md border border-gray-300 dark:border-[#3a3d45] bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-[#f2e9de] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c1552c]"
                    />
                  </div>

                  <div className="space-y-2 relative z-20">
                    <label className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]">
                      Transmission
                    </label>
                    <Select
                      value={formData.transmission}
                      onValueChange={(val) => handleChange({ target: { name: 'transmission', value: val } })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Transmission" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Automatic">Automatic</SelectItem>
                        <SelectItem value="Manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 relative z-10">
                    <label className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]">
                      Car Year
                    </label>
                    <Select
                      value={formData.car_year}
                      onValueChange={(val) => handleChange({ target: { name: 'car_year', value: val } })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]">
                      Maintenance Types & Intervals (Days)
                    </label>
                    <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-[#3a3d45] rounded-md p-2 bg-transparent grid grid-cols-1 gap-2">
                      {maintenanceTypes.map((type) => {
                        const selectedType = formData.maintenanceTypes.find(t => t.type === type);
                        const isSelected = !!selectedType;
                        
                        return (
                          <div key={type} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-[#2c3242]">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`maint-${type}`}
                                checked={isSelected}
                                onChange={() => toggleMaintenanceType(type)}
                                className="w-4 h-4 rounded border-gray-300 dark:border-[#3a3d45] text-[#c1552c] focus:ring-[#c1552c] bg-gray-50 dark:bg-[#1e222d] cursor-pointer"
                              />
                              <label htmlFor={`maint-${type}`} className="text-sm text-gray-700 dark:text-[#cfd3da] cursor-pointer select-none">
                                {type.replace(/_/g, " ")}
                              </label>
                            </div>
                            {isSelected && (
                              <input
                                type="number"
                                placeholder="Days"
                                value={selectedType.intervalDays || ""}
                                onChange={(e) => updateMaintenanceInterval(type, e.target.value)}
                                className="w-20 h-8 text-sm rounded-md border border-gray-300 dark:border-[#3a3d45] bg-transparent px-2 text-gray-900 dark:text-[#f2e9de] focus:outline-none focus:ring-1 focus:ring-[#c1552c]"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
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
                    onClick={handleSaveCar}
                    className="px-6 py-2 bg-[#c1552c] text-white rounded-lg hover:bg-[#a64724] transition-colors shadow-sm shadow-[#c1552c]/20 text-sm font-medium"
                  >
                    Save Vehicle
                  </button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white dark:bg-[#1e222d] rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm overflow-hidden transition-colors duration-300">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 dark:bg-[#171a22]/50 hover:bg-gray-50/50 dark:hover:bg-[#171a22]/50">
              <TableHead className="w-12">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 dark:border-[#3a3d45] text-[#c1552c] focus:ring-[#c1552c] bg-gray-50 dark:bg-[#1e222d] cursor-pointer" />
              </TableHead>
              <TableHead className="cursor-pointer hover:text-gray-900 dark:hover:text-[#cfd3da]">
                <div className="flex items-center space-x-1">
                  <span>{t("Vehicle Model")}</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </TableHead>
              <TableHead>{t("License Plate")}</TableHead>
              <TableHead>{t("Transmission")}</TableHead>
              <TableHead>{t("Current Mileage")}</TableHead>
              <TableHead>{t("Assigned To")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.data.map((vehicle, i) => (
              <TableRow key={i} className="group cursor-pointer">
                <TableCell>
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 dark:border-[#3a3d45] text-[#c1552c] focus:ring-[#c1552c] bg-gray-50 dark:bg-[#1e222d] cursor-pointer" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#2c3242] flex items-center justify-center text-gray-500 dark:text-[#8a8d96]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2a3 3 0 1 0 6 0h2a3 3 0 1 0 6 0zm-8-7H5.6L6.5 8h4.5v2zm4 0v-2h1.5c.3 0 .7.2.9.5l1.6 1.5H15z" /></svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-[#f2e9de] group-hover:text-[#c1552c] transition-colors">{vehicle.name}</div>
                      <div className="text-xs text-gray-500 dark:text-[#8a8d96]">{vehicle.car_year}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-bold text-gray-700 dark:text-[#cfd3da] uppercase tracking-wider bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-500 px-2.5 py-1 rounded border border-yellow-200 dark:border-yellow-700/50 inline-block shadow-sm">
                    {vehicle.car_Number}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center text-sm font-medium text-gray-700 dark:text-[#cfd3da]">
                    {vehicle.transmission === 'Manual' ? (
                      <span className="bg-gray-100 dark:bg-[#232734] px-2 py-1 rounded text-gray-600 dark:text-gray-300">Manual</span>
                    ) : (
                      <span className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded text-blue-600 dark:text-blue-400">Automatic</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-between group/mileage">
                    <span className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]">{vehicle.mileage || '0 mi'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className={`text-sm ${vehicle.instructor === 'Unassigned' ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-700 dark:text-[#cfd3da] font-medium'}`}>
                    {vehicle.instructor}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border flex items-center w-fit ${
                    vehicle.status === 'Available' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50' : 
                    vehicle.status === 'On Lesson' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50' : 
                    'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
                  }`}>
                    {vehicle.status === 'Available' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>}
                    {vehicle.status || 'Available'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <button className="p-2 text-gray-400 hover:text-[#c1552c] dark:text-[#8a8d96] dark:hover:text-[#c1552c] rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all focus:outline-none">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 13a1 1 0 100-2 1 1 0 000 2zm0-5a1 1 0 100-2 1 1 0 000 2zm0 10a1 1 0 100-2 1 1 0 000 2z"></path></svg>
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {/* Pagination Footer */}
        <div className="bg-gray-50 dark:bg-[#171a22] px-6 py-4 border-t border-gray-200 dark:border-[#2c3242] flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500 dark:text-[#8a8d96]">
            Page <span className="text-gray-900 dark:text-[#f2e9de]">{vehicles.pagination.currentPage}</span> of <span className="text-gray-900 dark:text-[#f2e9de]">{vehicles.pagination.totalPages}</span> (Total: {vehicles.pagination.totalCars})
          </span>
          <div className="flex space-x-2">
            <button className="px-4 py-1.5 border border-gray-300 dark:border-[#3a3d45] rounded-lg text-sm font-medium text-gray-600 dark:text-[#cfd3da] hover:bg-gray-100 dark:hover:bg-[#2c3242] transition-colors disabled:opacity-50" disabled={!vehicles.pagination.hasPreviousPage}>Previous</button>
            <button className="px-4 py-1.5 border border-gray-300 dark:border-[#3a3d45] rounded-lg text-sm font-medium text-gray-600 dark:text-[#cfd3da] hover:bg-gray-100 dark:hover:bg-[#2c3242] transition-colors shadow-sm disabled:opacity-50" disabled={!vehicles.pagination.hasNextPage}>Next</button>
          </div>
        </div>
      </div>
      
      <AlertDialog open={alertInfo.open} onOpenChange={(open) => setAlertInfo((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertInfo.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertInfo.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertInfo((prev) => ({ ...prev, open: false }))}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
