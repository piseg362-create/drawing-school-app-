import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchApi } from "@/lib/api";


// Pre-defined list of popular Indian cars
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

// Dynamically generate years from current year down to 2000
const CURRENT_YEAR = new Date().getFullYear();
const CAR_YEARS = Array.from(
  { length: CURRENT_YEAR - 2000 + 1 },
  (_, index) => (CURRENT_YEAR - index).toString()
);

const Car = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    name: "",
    transmission: "",
    car_year: "",
    car_Number: "",
  });

  // State to track if the user selected "Other"
  const [carSelection, setCarSelection] = useState("");
  const [isCustomCar, setIsCustomCar] = useState(false);

  // Handle standard text inputs (for custom car name and car number)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle Shadcn Select change for the Car Name
  const handleCarSelect = (value) => {
    setCarSelection(value);
    if (value === "Other") {
      setIsCustomCar(true);
      setFormData((prev) => ({ ...prev, name: "" })); // Clear the name so they can type it
    } else {
      setIsCustomCar(false);
      setFormData((prev) => ({ ...prev, name: value })); // Set to the selected predefined car
    }
  };

  // Handle Shadcn Select change for Transmission
  const handleTransmissionSelect = (value) => {
    setFormData((prev) => ({ ...prev, transmission: value }));
  };

  // Handle Shadcn Select change for Car Year
  const handleYearSelect = (value) => {
    setFormData((prev) => ({ ...prev, car_year: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting Car Data:", formData);

    try {
      const fetchData = await fetchApi("/car-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await fetchData.json();

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error submitting car data:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Car Name Selection */}
      <div className="space-y-2">
        <Label htmlFor="car-name" className="text-gray-900 dark:text-[#f2e9de]">
          Car Name / Model
        </Label>

        <Select onValueChange={handleCarSelect} value={carSelection}>
          <SelectTrigger className="w-full bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus:ring-[#c1552c]">
            <SelectValue placeholder="Select a car model" />
          </SelectTrigger>

          <SelectContent className="w-[75vw] bg-white dark:bg-[#171a22] border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de]">
            <div className="grid grid-cols-2 gap-1 p-1">
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

        {/* Dynamic Input if "Other" is selected */}
        {isCustomCar && (
          <div className="pt-2">
            <Input
              id="car-name-custom"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Type your car name here..."
              required
              className="bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus-visible:ring-[#c1552c] placeholder:text-gray-400 dark:placeholder:text-[#5a5f6e]"
            />
          </div>
        )}
      </div>

      {/* Transmission */}
      <div className="space-y-2">
        <Label
          htmlFor="car-transmission"
          className="text-gray-900 dark:text-[#f2e9de]"
        >
          Transmission
        </Label>
        <Select
          onValueChange={handleTransmissionSelect}
          value={formData.transmission}
        >
          <SelectTrigger className="w-full bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus:ring-[#c1552c]">
            <SelectValue placeholder="Select transmission type" />
          </SelectTrigger>

          <SelectContent className="w-[75vw] bg-white dark:bg-[#171a22] border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de]">
            <div className="grid grid-cols-2 gap-1 p-1">
              <SelectItem value="Manual">Manual</SelectItem>
              <SelectItem value="Automatic">Automatic</SelectItem>
            </div>
          </SelectContent>
        </Select>
      </div>

      {/* Car Year (Now Dynamic Select) */}
      <div className="space-y-2">
        <Label htmlFor="car-year" className="text-gray-900 dark:text-[#f2e9de]">
          Car Year
        </Label>
        
        <Select onValueChange={handleYearSelect} value={formData.car_year}>
          <SelectTrigger className="w-full bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus:ring-[#c1552c]">
            <SelectValue placeholder="Select manufacturing year" />
          </SelectTrigger>

          <SelectContent className="w-[75vw] bg-white dark:bg-[#171a22] border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] max-h-60">
            {/* Using a 3-column grid since years are short numbers */}
            <div className="grid grid-cols-3 gap-1 p-1">
              {CAR_YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </div>
          </SelectContent>
        </Select>
      </div>

      {/* Car Number */}
      <div className="space-y-2">
        <Label
          htmlFor="car-number"
          className="text-gray-900 dark:text-[#f2e9de]"
        >
          Car Number (License Plate)
        </Label>
        <Input
          id="car-number"
          name="car_Number"
          value={formData.car_Number}
          onChange={handleChange}
          placeholder="e.g. MH-12-AB-1234"
          required
          className="bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus-visible:ring-[#c1552c] placeholder:text-gray-400 dark:placeholder:text-[#5a5f6e]"
        />
      </div>

      <div className="pt-4 flex gap-3">
        
        <Button
          type="submit"
          className="flex-1 bg-[#c1552c] text-white hover:bg-[#a84a26]"
        >
          Save Car Details
        </Button>
      </div>
    </form>
  );
};

export default Car;