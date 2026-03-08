import { useEffect, useMemo, useState } from "react";
import { Users, UserCheck, Package, CreditCard } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminAPI, type AdminOrder, type AdminOverview } from "@/lib/api";
import { toast } from "sonner";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [overviewRes, ordersRes] = await Promise.all([
          adminAPI.getOverview(),
          adminAPI.getOrders({ limit: "300" }),
        ]);

        if (!overviewRes.success || !overviewRes.overview) {
          throw new Error(overviewRes.message || "Failed to load overview");
        }

        if (!ordersRes.success) {
          throw new Error(ordersRes.message || "Failed to load order analytics");
        }

        setOverview(overviewRes.overview);
        setOrders(ordersRes.orders || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load overview");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const stats = [
    { title: "Total Users", value: overview?.total_users ?? 0 },
    { title: "Pending Farmers", value: overview?.pending_farmers ?? 0 },
    { title: "Pending Products", value: overview?.pending_products ?? 0 },
    { title: "Active Products", value: overview?.active_products ?? 0 },
    { title: "Today Orders", value: overview?.today_orders ?? 0 },
    { title: "Pending Payments", value: overview?.pending_payments ?? 0 },
    { title: "Total Orders", value: overview?.total_orders ?? 0 },
    { title: "Revenue", value: `LKR ${(overview?.total_revenue ?? 0).toFixed(2)}` },
  ];

  const quickCards = [
    {
      title: "User Base",
      value: overview?.total_users ?? 0,
      note: `${overview?.total_farmers ?? 0} farmers, ${overview?.total_buyers ?? 0} buyers`,
      icon: Users,
    },
    {
      title: "Approvals Waiting",
      value: (overview?.pending_farmers ?? 0) + (overview?.pending_products ?? 0),
      note: `${overview?.pending_farmers ?? 0} farmers + ${overview?.pending_products ?? 0} products`,
      icon: UserCheck,
    },
    {
      title: "Product Health",
      value: overview?.active_products ?? 0,
      note: `${overview?.total_products ?? 0} total listed products`,
      icon: Package,
    },
    {
      title: "Payment Queue",
      value: overview?.pending_payments ?? 0,
      note: `LKR ${(overview?.total_revenue ?? 0).toFixed(2)} total revenue`,
      icon: CreditCard,
    },
  ];

  const miniTrend = useMemo(() => {
    const grouped = new Map<string, { day: string; orders: number; revenue: number }>();

    for (const order of orders) {
      const date = new Date(order.created_at);
      const key = date.toISOString().slice(0, 10);
      const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const current = grouped.get(key) || { day: label, orders: 0, revenue: 0 };
      current.orders += 1;
      current.revenue += Number(order.amount || 0);
      grouped.set(key, current);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([, value]) => value);
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Admin Dashboard Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading analytics..." : "Recent platform activity is shown here for quick admin review."}
            </p>
            <div className="h-[220px]">
              {loading ? (
                <p className="text-sm text-muted-foreground">Preparing mini graph...</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={miniTrend}>
                    <defs>
                      <linearGradient id="adminOrdersFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2f855a" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2f855a" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="orders" stroke="#2f855a" fill="url(#adminOrdersFill)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Admin Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Today Orders</p>
              <p className="mt-2 text-3xl font-bold">{overview?.today_orders ?? 0}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="mt-2 text-3xl font-bold">LKR {(overview?.total_revenue ?? 0).toFixed(2)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Pending Actions</p>
              <p className="mt-2 text-3xl font-bold">
                {(overview?.pending_farmers ?? 0) + (overview?.pending_products ?? 0) + (overview?.pending_payments ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {quickCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-2xl">{card.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{card.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader className="pb-2">
              <p className="text-sm text-muted-foreground">{s.title}</p>
              <CardTitle className="text-2xl">{s.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
