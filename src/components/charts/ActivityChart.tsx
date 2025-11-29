'use client';

interface ActivityData {
  date: string;
  items: number;
  claims: number;
  tickets: number;
}

interface ActivityChartProps {
  data: ActivityData[];
  title: string;
}

export default function ActivityChart({ data, title }: ActivityChartProps) {
  const maxValue = Math.max(...data.flatMap(d => [d.items, d.claims, d.tickets]), 1);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="flex items-end space-x-2 h-48">
        {data.map((day, index) => (
          <div key={day.date} className="flex-1 flex flex-col items-center space-y-1">
            <div className="flex items-end justify-center space-x-1 flex-1 w-full">
              <div
                className="w-1/3 bg-blue-500 rounded-t transition-all duration-300 hover:opacity-80"
                style={{ height: `${(day.items / maxValue) * 80}%` }}
                title={`Items: ${day.items}`}
              />
              <div
                className="w-1/3 bg-green-500 rounded-t transition-all duration-300 hover:opacity-80"
                style={{ height: `${(day.claims / maxValue) * 80}%` }}
                title={`Claims: ${day.claims}`}
              />
              <div
                className="w-1/3 bg-yellow-500 rounded-t transition-all duration-300 hover:opacity-80"
                style={{ height: `${(day.tickets / maxValue) * 80}%` }}
                title={`Tickets: ${day.tickets}`}
              />
            </div>
            <span className="text-xs text-gray-500 truncate w-full text-center">
              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-center space-x-4 mt-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-gray-600">Items</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-600">Claims</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span className="text-gray-600">Tickets</span>
        </div>
      </div>
    </div>
  );
}