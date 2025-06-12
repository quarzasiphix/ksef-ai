import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SettingItem from "./SettingItem";

interface Item {
  title: string;
  description: string;
  icon?: React.ElementType;
  href?: string;
  action?: () => void;
  premium?: boolean;
}

interface SettingCategoryProps {
  title: string;
  icon: React.ElementType;
  items: Item[];
  isPremium: boolean;
}

const SettingCategory: React.FC<SettingCategoryProps> = ({ title, icon: Icon, items, isPremium }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.map((item) => (
          <SettingItem key={item.title} {...item} isPremium={isPremium} />
        ))}
      </CardContent>
    </Card>
  );
};

export default SettingCategory; 