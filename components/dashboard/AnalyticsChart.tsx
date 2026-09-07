"use client";

import { useEffect, useState, useId } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown } from "lucide-react";

interface ChartData {
  name: string;
  fullDate: string;
  conversations: number;
}

export default function AnalyticsChart() {
  const supabase = createClient();
  const gradientId = useId();

  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalInPeriod, setTotalInPeriod] = useState(0);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);

      const { data: conversations, error } = await supabase
        .from("conversations")
        .select("created_at")
        .or(`profile_id.eq.${user.id},user_id.eq.${user.id}`)
        .gte("created_at", startDate.toISOString());

      if (error) {
        console.error("Failed to load analytics:", error);
      }

      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];

      const chartData: ChartData[] = [];
      let sum = 0;

      for (let i = 6; i >= 0; i--) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - i);

        const monthName = monthNames[targetDate.getMonth()];
        const dayNum = targetDate.getDate();
        const label = `${monthName} ${dayNum}`;

        const count =
          conversations?.filter((item) => {
            const itemDate = new Date(item.created_at);
            return (
              itemDate.getDate() === targetDate.getDate() &&
              itemDate.getMonth() === targetDate.getMonth() &&
              itemDate.getFullYear() === targetDate.getFullYear()
            );
          }).length ?? 0;

        sum += count;

        chartData.push({
          name: label,
          fullDate: targetDate.toLocaleDateString(),
          conversations: count,
        });
      }

      setTotalInPeriod(sum);
      setData(chartData);
    } catch (err) {
      console.error("Error loading analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate clean Y-axis ticks
  const maxVal = Math.max(...data.map((d) => d.conversations), 10);
  const yDomainMax = Math.ceil(maxVal / 10) * 10;

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] p-6 sm:p-7 shadow-xs transition-colors flex flex-col justify-between h-full">
      {/* Header with Title and Range Picker */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Conversation Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            AI conversations during the last 7 days.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 self-start sm:self-auto">
          <span>Last 7 days</span>
          <ChevronDown size={14} className="text-slate-400 dark:text-slate-500" />
        </div>
      </div>

      {/* Chart Canvas */}
      {loading ? (
        <div className="h-72 w-full flex items-center justify-center">
          <div className="space-y-2 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-[#5B3DF5]" />
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Loading analytics...
            </p>
          </div>
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id={`gradient-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5B3DF5" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#5B3DF5" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-slate-100 dark:text-white/5"
              />

              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={10}
              />

              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                domain={[0, yDomainMax]}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#181b24] p-3 shadow-xl text-xs">
                        <p className="font-semibold text-slate-500 dark:text-slate-400">
                          {payload[0].payload.name}
                        </p>
                        <p className="text-sm font-extrabold text-[#5B3DF5] dark:text-[#9B7CFC] mt-0.5">
                          {payload[0].value}{" "}
                          <span className="text-xs font-normal text-slate-600 dark:text-slate-300">
                            conversations
                          </span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="monotone"
                dataKey="conversations"
                stroke="#5B3DF5"
                strokeWidth={3}
                fillOpacity={1}
                fill={`url(#gradient-${gradientId})`}
                dot={{ r: 4, fill: "#5B3DF5", stroke: "#ffffff", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#5B3DF5", stroke: "#ffffff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}