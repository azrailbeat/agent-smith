import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/lib/types";

interface StatsCardsProps {
  stats: StatCard[];
  isLoading?: boolean;
}

const StatsCards = ({ stats, isLoading = false }: StatsCardsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white overflow-hidden shadow">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                <div className="h-8 bg-neutral-200 rounded w-1/2 mt-3"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/4 mt-4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-white overflow-hidden shadow">
          <CardContent className="px-4 py-5 sm:p-6">
            <dl>
              <dt className="text-sm font-medium text-neutral-500 truncate">
                {stat.title}
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-neutral-900">
                {stat.value}
              </dd>
              {stat.change && (
                <dd className="mt-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${stat.change.isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {stat.change.value}
                  </span>
                </dd>
              )}
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;
