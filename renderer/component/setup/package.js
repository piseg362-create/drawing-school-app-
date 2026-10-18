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
import { Slider } from "@/components/ui/slider";
import { fetchApi } from "@/lib/api";


// Pre-defined list of common driving school packages
const PREDEFINED_PACKAGES = [
  { name: "Basic Two-Wheeler", price: 2500, duration: 15 },
  { name: "Standard Four-Wheeler (Manual)", price: 4500, duration: 21 },
  { name: "Standard Four-Wheeler (Automatic)", price: 5000, duration: 21 },
  { name: "Refresher Course (Four-Wheeler)", price: 2000, duration: 7 },
  { name: "Comprehensive (Two + Four Wheeler)", price: 6500, duration: 30 },
];

const Package = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    duration: 1, // Defaulting to 1 day minimum
  });

  // Dynamic maximum limit for the price slider
  const [maxPriceLimit, setMaxPriceLimit] = useState(5000);

  // States for package selection
  const [packageSelection, setPackageSelection] = useState("");
  const [isCustomPackage, setIsCustomPackage] = useState(false);

  // Handle text input (for custom name)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle Package Dropdown Auto-fill
  const handlePackageSelect = (value) => {
    setPackageSelection(value);

    if (value === "Other") {
      setIsCustomPackage(true);
      setFormData({ name: "", price: 0, duration: 1 });
      setMaxPriceLimit(5000); // Reset max limit
    } else {
      setIsCustomPackage(false);
      const selected = PREDEFINED_PACKAGES.find((pkg) => pkg.name === value);

      if (selected) {
        // If the predefined price is higher than our current max limit,
        // we need to dynamically increase the limit so the slider doesn't break
        let newMax = 5000;
        while (selected.price >= newMax) {
          newMax *= 2;
        }
        setMaxPriceLimit(newMax);

        setFormData({
          name: selected.name,
          price: selected.price,
          duration: selected.duration,
        });
      }
    }
  };

  // Handle Dynamic Price Slider
  const handlePriceChange = (value) => {
    const newPrice = value[0]; // Shadcn slider returns an array

    // If user hits the exact maximum limit, double the limit to give them more room
    if (newPrice >= maxPriceLimit) {
      setMaxPriceLimit((prevMax) => prevMax * 2);
    }

    setFormData((prev) => ({ ...prev, price: newPrice }));
  };

  // Handle Duration Slider
  const handleDurationChange = (value) => {
    setFormData((prev) => ({ ...prev, duration: value[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting Package Data:", formData);

    try {
      const fetchData = await fetchApi("/package-setup", {
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
      console.error("Error submitting package data:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Package Selection */}
      <div className="space-y-2">
        <Label
          htmlFor="package-select"
          className="text-gray-900 dark:text-[#f2e9de]"
        >
          Select Package Type
        </Label>

        <Select onValueChange={handlePackageSelect} value={packageSelection}>
          <SelectTrigger className="w-full bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus:ring-[#c1552c]">
            <SelectValue placeholder="Choose a standard package" />
          </SelectTrigger>

          <SelectContent className="w-[var(--radix-select-trigger-width)] bg-white dark:bg-[#171a22] border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de]">
            <div className="flex flex-col">
              {PREDEFINED_PACKAGES.map((pkg) => (
                <SelectItem key={pkg.name} value={pkg.name}>
                  {pkg.name}
                </SelectItem>
              ))}
              <SelectItem
                value="Other"
                className="font-medium border-t border-gray-200 dark:border-[#2c3242] mt-1 pt-2"
              >
                Other (Create custom package)
              </SelectItem>
            </div>
          </SelectContent>
        </Select>

        {/* Dynamic Input if "Other" is selected */}
        {isCustomPackage && (
          <div className="pt-2">
            <Label htmlFor="package-name-custom" className="sr-only">
              Custom Package Name
            </Label>
            <Input
              id="package-name-custom"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Type custom package name..."
              required
              className="bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus-visible:ring-[#c1552c] placeholder:text-gray-400 dark:placeholder:text-[#5a5f6e]"
            />
          </div>
        )}
      </div>

      {/* Package Price Slider */}
      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-center">
          <Label className="text-gray-900 dark:text-[#f2e9de]">Price</Label>
          <span className="text-[#c1552c] font-bold text-lg">
            ₹ {formData.price.toLocaleString("en-IN")}
          </span>
        </div>
        <Slider
          value={[formData.price]}
          min={0}
          max={maxPriceLimit}
          step={5} // Divisible by 5
          onValueChange={handlePriceChange}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>₹ 0</span>
          <span>₹ {maxPriceLimit.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Package Duration Slider */}
      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-center">
          <Label className="text-gray-900 dark:text-[#f2e9de]">
            Duration (Days / Classes)
          </Label>
          <span className="text-[#c1552c] font-bold text-lg">
            {formData.duration} {formData.duration === 1 ? "Day" : "Days"}
          </span>
        </div>
        <Slider
          value={[formData.duration]}
          min={1}
          max={31} // Fixed to 31 max
          step={1}
          onValueChange={handleDurationChange}
          className="py-2 "
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>1 Day</span>
          <span>31 Days</span>
        </div>
      </div>

      <div className="pt-4 flex gap-3">
        
        <Button
          type="submit"
          className="flex-1 bg-[#c1552c] text-white hover:bg-[#a84a26]"
          // Disable button if name isn't filled
          disabled={!formData.name}
        >
          Save Package
        </Button>
      </div>
    </form>
  );
};

export default Package;
