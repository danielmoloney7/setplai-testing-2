
import React from 'react';

export const NotificationBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 bg-brand-error text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-brand-dark">
      {count}
    </span>
  );
};
