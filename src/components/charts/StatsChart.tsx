'use client';

interface StatsChartProps {
  data: {
    labels: string[];
    values: number[];
  };
  title: string;
  color?: string;
}

export default function StatsChart({ data, title, color = '#FF385C' }: StatsChartProps) {
  const maxValue = Math.max(...data.values, 1);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.labels.map((label, index) => {
          const percentage = (data.values[index] / maxValue) * 100;
          return (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{label}</span>
                <span className="font-medium text-gray-900">{data.values[index]}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}