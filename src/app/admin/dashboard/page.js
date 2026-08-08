"use client";

import { useEffect, useState } from "react";
import { Users, Store, ClipboardList, CheckCircle } from "lucide-react";
import dynamic from "next/dynamic";

/**
 * @file page.js
 * @description Admin Dashboard Page.
 * Displays key platform metrics (Vendors, Users, Pending Requests) and activity charts.
 * Fetches data from `/api/admin/dashboard/stats`.
 */

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    vendors: 0,
    users: 0,
    suppliers: 0,
    pendingVendors: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "Admin Dashboard | Stitch";

    // PRIVILEGE 1: High-Level Platform Analytics
    // Admins have access to the dashboard stats API, which aggregates data from all 
    // users, vendors, and suppliers across the entire system.
    const fetchStats = async () => {
      // The admin's master token is checked by the server before returning this sensitive data
      const token = localStorage.getItem("adminToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/admin/dashboard/stats", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch data");

        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch admin stats", error);
        setError("Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="bg-red-50 border border-red-100 p-6 rounded-xl text-center">
          <p className="text-red-500 font-semibold mb-2">Error Loading Dashboard</p>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time metrics and platform analytics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Vendors"
          count={stats.vendors}
          icon={<Store className="text-indigo-600 w-6 h-6" />}
          color="bg-indigo-50 border-indigo-100 text-indigo-600"
          loading={loading}
        />
        <StatCard
          title="Total Customers"
          count={stats.users}
          icon={<Users className="text-blue-600 w-6 h-6" />}
          color="bg-blue-50 border-blue-100 text-blue-600"
          loading={loading}
        />
        <StatCard
          title="Pending Vendor Requests"
          count={stats.pendingVendors || 0}
          icon={<ClipboardList className="text-purple-600 w-6 h-6" />}
          color="bg-purple-50 border-purple-100 text-purple-600"
          loading={loading}
        />
        <StatCard
          title="Total Suppliers"
          count={stats.suppliers || 0}
          icon={<CheckCircle className="text-emerald-600 w-6 h-6" />}
          color="bg-emerald-50 border-emerald-100 text-emerald-600"
          loading={loading}
        />
      </div>

      {/* Admin Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-8">
        <h2 className="text-lg font-bold text-slate-800 mb-6">User Activity (Last 7 Days)</h2>
        <div className="h-80 w-full">
          {loading ? (
            <div className="w-full h-full animate-pulse bg-slate-100 rounded-lg"></div>
          ) : (
            <AdminChart />
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable Stat Card Component
function StatCard({ title, count, icon, color, loading }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-slate-100 animate-pulse rounded"></div>
          ) : (
            <h3 className="text-3xl font-bold text-slate-800">{count}</h3>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// Separate component for lazy loading chart. Using Light Theme colors.
function AdminChart() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [chartData, setChartData] = useState({
    series: [{ name: "New Users", data: [12, 19, 3, 5, 2, 3, 20] }, { name: "Orders", data: [5, 12, 1, 4, 1, 2, 12] }],
    options: {
      chart: { toolbar: { show: false }, background: "transparent", fontFamily: 'Inter, sans-serif' },
      colors: ["#6366f1", "#0ea5e9"], // Indigo-500, Sky-500
      xaxis: {
        categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        labels: { style: { colors: "#64748b" } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: { labels: { style: { colors: "#64748b" } } },
      grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.1, stops: [0, 100] } },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3 },
      theme: { mode: 'light' },
      tooltip: { theme: 'light' },
      legend: { show: false }
    },
  });

  if (!mounted) {
    return <div className="w-full h-full animate-pulse bg-slate-100 rounded-lg"></div>;
  }

  return <ReactApexChart options={chartData.options} series={chartData.series} type="area" height="100%" />;
}