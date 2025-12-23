import React from "react";
import { Link } from "react-router-dom";

interface SettingItemProps {
  title: string;
  description: string;
  icon?: React.ElementType;
  href?: string;
  action?: () => void;
  premium?: boolean;
  isPremium?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  description,
  icon: Icon,
  href,
  action,
  premium,
  isPremium,
}) => {
  const content = (
    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
      {Icon && <Icon className="h-5 w-5 text-blue-500 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      </div>
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return (
    <div onClick={action} className="w-full">
      {content}
    </div>
  );
};

export default SettingItem; 