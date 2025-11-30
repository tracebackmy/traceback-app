'use client';

import React from 'react';

interface StatsWidgetProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'default' | 'brand' | 'green' | 'blue';
}

export const StatsWidget: React.FC<StatsWidgetProps> = ({ 
  title, 
  value, 
  icon,
  color = 'default' 
}) => {
  const colorStyles = {
    default: 'text-ink',
    brand: 'text-brand',
    green: 'text-green-600',
    blue: 'text-blue-600'
  };

  return (
    <div className="bg-white overflow-hidden shadow-soft rounded-2xl border border-border p-5 transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <dt className="text-sm font-medium text-muted truncate">{title}</dt>
          <dd className={`mt-1 text-3xl font-extrabold ${colorStyles[color]}`}>
            {value}
          </dd>
        </div>
        {icon && (
          <div className={`p-3 rounded-xl bg-gray-50 ${colorStyles[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsWidget;