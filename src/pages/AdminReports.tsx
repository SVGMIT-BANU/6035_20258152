import { useEffect, useMemo, useState } from "react";
import { Download, BarChart3, Users, ShoppingBag, CreditCard, Clock3 } from "lucide-react";
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
import {
  adminAPI,
  type AdminOrder,
  type AdminOverview,
  type AdminTopProduct,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ReportPeriod = "daily" | "monthly" | "yearly";

type ChartPoint = {
  key: string;
  label: string;
  orders: number;
  revenue: number;
};

const periodOptions: Array<{ value: ReportPeriod; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const AdminReports = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<ReportPeriod>("daily");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [topProducts, setTopProducts] = useState<AdminTopProduct[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [ordersRes, overviewRes, reportsRes] = await Promise.all([
          adminAPI.getOrders({ limit: "500" }),
          adminAPI.getOverview(),
          adminAPI.getReports(),
        ]);

        if (!ordersRes.success) {
          throw new Error(ordersRes.message || "Failed to load admin orders");
        }
        if (!overviewRes.success) {
          throw new Error(overviewRes.message || "Failed to load admin overview");
        }
        if (!reportsRes.success) {
          throw new Error(reportsRes.message || "Failed to load admin reports");
        }

        setOrders(ordersRes.orders || []);
        setOverview(overviewRes.overview || null);
        setTopProducts(reportsRes.top_products || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load admin analytics");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const trendData = useMemo<ChartPoint[]>(() => {
    const grouped = new Map<string, ChartPoint>();

    for (const order of orders) {
      const date = new Date(order.created_at);
      const key =
        period === "daily"
          ? date.toISOString().slice(0, 10)
          : period === "monthly"
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
            : String(date.getFullYear());

      const label =
        period === "daily"
          ? date.toLocaleDateString()
          : period === "monthly"
            ? date.toLocaleDateString(undefined, { month: "short", year: "numeric" })
            : String(date.getFullYear());

      const current = grouped.get(key) || {
        key,
        label,
        orders: 0,
        revenue: 0,
      };

      current.orders += 1;
      current.revenue += Number(order.amount || 0);
      grouped.set(key, current);
    }

    return Array.from(grouped.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(period === "daily" ? -14 : period === "monthly" ? -12 : -6);
  }, [orders, period]);

  const activityData = useMemo(() => {
    if (!overview) return [];

    return [
      { label: "Users", value: overview.total_users, icon: Users },
      { label: "Products", value: overview.total_products, icon: ShoppingBag },
      { label: "Orders", value: overview.total_orders, icon: BarChart3 },
      { label: "Pending Payments", value: overview.pending_payments, icon: CreditCard },
      { label: "Pending Farmers", value: overview.pending_farmers, icon: Clock3 },
    ];
  }, [overview]);

  const reportSummary = useMemo(() => {
    return trendData.reduce(
      (acc, item) => {
        acc.orders += item.orders;
        acc.revenue += item.revenue;
        return acc;
      },
      { orders: 0, revenue: 0 }
    );
  }, [trendData]);

  const downloadCsv = () => {
    const rows = [
      ["Period", "Orders", "Revenue"],
      ...trendData.map((item) => [item.label, String(item.orders), item.revenue.toFixed(2)]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `admin-${period}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Admin Analytics</CardTitle>
            <p className="text-sm text-muted-foreground">
              System activity, order trends, and downloadable reports for admin use.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {periodOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={period === option.value ? "default" : "outline"}
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </Button>
            ))}
            <Button type="button" variant="secondary" onClick={downloadCsv} disabled={!trendData.length}>
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Selected Period</p>
            <p className="mt-2 text-2xl font-bold capitalize">{period}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Orders in View</p>
            <p className="mt-2 text-2xl font-bold">{reportSummary.orders}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Revenue in View</p>
            <p className="mt-2 text-2xl font-bold">LKR {reportSummary.revenue.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{periodOptions.find((item) => item.value === period)?.label} Order and Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading analytics...</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#2f855a" strokeWidth={3} name="Orders" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#c58b4e" strokeWidth={3} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Activity Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading activity...</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2f855a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Product</th>
                  <th className="py-2 text-left">Orders</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product) => (
                  <tr key={product.name} className="border-b">
                    <td className="py-2">{product.name}</td>
                    <td className="py-2">{product.order_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{periodOptions.find((item) => item.value === period)?.label} Report Table</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Period</th>
                  <th className="py-2 text-left">Orders</th>
                  <th className="py-2 text-left">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {trendData.map((item) => (
                  <tr key={item.key} className="border-b">
                    <td className="py-2">{item.label}</td>
                    <td className="py-2">{item.orders}</td>
                    <td className="py-2">LKR {item.revenue.toFixed(2)}</td>
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

export default AdminReports;
