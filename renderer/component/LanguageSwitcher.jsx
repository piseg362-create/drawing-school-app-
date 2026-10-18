"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="w-28">
      <Select value={i18n.language} onValueChange={changeLanguage}>
        <SelectTrigger className="h-9 border-gray-200 dark:border-[#3a3d45] bg-white dark:bg-[#171a22] text-sm text-gray-700 dark:text-[#cfd3da]">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-[#171a22] border-gray-200 dark:border-[#3a3d45]">
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
          <SelectItem value="mr">मराठी (Marathi)</SelectItem>
          <SelectItem value="kn">ಕನ್ನಡ (Kannada)</SelectItem>
          <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
          <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
