import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { farmerAPI, type AdminReportDaily, type AdminTopProduct } from "@/lib/api";
import { toast } from "sonner";

const FarmerReports = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const farmerId = user?.id;
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [daily, setDaily] = useState<AdminReportDaily[]>([]);
  const [top, setTop] = useState<AdminTopProduct[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!farmerId) return;

      try {
        setLoading(true);
        const res = await farmerAPI.getReports(farmerId, days);
        if (res.success) {
          setDaily(res.daily_sales || []);
          setTop(res.top_products || []);
          return;
        }
        toast.error(res.message || "Failed to load reports");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [farmerId, days]);

  const summary = useMemo(() => {
    return daily.reduce(
      (acc, item) => {
        acc.orders += item.orders;
        acc.revenue += Number(item.revenue || 0);
        return acc;
      },
      { orders: 0, revenue: 0 }
    );
  }, [daily]);

  const chartData = useMemo(() => {
    return [...daily]
      .reverse()
      .map((item) => ({
        label: new Date(item.report_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        orders: item.orders,
        revenue: Number(item.revenue || 0),
      }));
  }, [daily]);

  const downloadCsv = () => {
    const rows = [
      ["Date", "Orders", "Revenue"],
      ...daily.map((item) => [
        new Date(item.report_date).toLocaleDateString(),
        String(item.orders),
        Number(item.revenue || 0).toFixed(2),
      ]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `farmer-sales-${days}-days.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Sales Reports</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant={days === 7 ? "default" : "outline"} onClick={() => setDays(7)} disabled={loading}>7 Days</Button>
              <Button variant={days === 30 ? "default" : "outline"} onClick={() => setDays(30)} disabled={loading}>30 Days</Button>
              <Button variant={days === 90 ? "default" : "outline"} onClick={() => setDays(90)} disabled={loading}>90 Days</Button>
              <Button variant="secondary" onClick={downloadCsv} disabled={loading || daily.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Selected Period</p>
            <p className="mt-2 text-2xl font-bold">{days} Days</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Orders</p>
            <p className="mt-2 text-2xl font-bold">{summary.orders}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="mt-2 text-2xl font-bold">LKR {summary.revenue.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading chart...</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#2f855a" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading chart...</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#c58b4e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Revenue</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Orders</th>
                  <th className="text-left py-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {!loading && daily.length === 0 ? (
                  <tr>
                    <td className="py-4 text-muted-foreground" colSpan={3}>No sales found for the selected period.</td>
                  </tr>
                ) : null}
                {daily.map((d) => (
                  <tr key={d.report_date} className="border-b">
                    <td className="py-2">{new Date(d.report_date).toLocaleDateString()}</td>
                    <td className="py-2">{d.orders}</td>
                    <td className="py-2">LKR {Number(d.revenue).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Product</th>
                  <th className="text-left py-2">Orders</th>
                </tr>
              </thead>
              <tbody>
                {!loading && top.length === 0 ? (
                  <tr>
                    <td className="py-4 text-muted-foreground" colSpan={2}>No products found for the selected period.</td>
                  </tr>
                ) : null}
                {top.map((p) => (
                  <tr key={p.name} className="border-b">
                    <td className="py-2">{p.name}</td>
                    <td className="py-2">{p.order_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmerReports;
