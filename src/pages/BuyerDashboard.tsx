import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Heart, Package, Coins } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import { buyerAPI, type BuyerDashboardData, type BuyerOrder } from "@/lib/api";

const BuyerDashboard = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const buyerId = user?.id;
  const [dashboard, setDashboard] = useState<BuyerDashboardData | null>(null);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);

  useEffect(() => {
    const load = async () => {
      const [dashboardRes, ordersRes] = await Promise.all([
        buyerAPI.getDashboard(buyerId),
        buyerAPI.getOrders(buyerId),
      ]);
      if (dashboardRes.success && dashboardRes.dashboard) setDashboard(dashboardRes.dashboard);
      else toast.error(dashboardRes.message || "Failed to load buyer overview");

      if (ordersRes.success) setOrders(ordersRes.orders || []);
      else toast.error(ordersRes.message || "Failed to load buyer orders");
    };
    if (buyerId) load();
  }, [buyerId]);

  const stats = dashboard?.stats || {
    total_orders: 0,
    total_spent: 0,
    pending_orders: 0,
    saved_items: 0,
  };

  const chartData = useMemo(() => {
    const grouped = new Map<string, { label: string; spent: number }>();

    for (const order of orders) {
      const date = new Date(order.created_at);
      const key = date.toISOString().slice(0, 10);
      const current = grouped.get(key) || {
        label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        spent: 0,
      };
      current.spent += Number(order.amount || 0);
      grouped.set(key, current);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([, value]) => value);
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-3xl font-bold">{stats.total_orders}</p>
            </div>
            <Package className="h-6 w-6 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saved Items</p>
              <p className="text-3xl font-bold">{stats.saved_items}</p>
            </div>
            <Heart className="h-6 w-6 text-secondary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Orders</p>
              <p className="text-3xl font-bold">{stats.pending_orders}</p>
            </div>
            <ShoppingCart className="h-6 w-6 text-accent" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-3xl font-bold">LKR {stats.total_spent.toFixed(0)}</p>
            </div>
            <Coins className="h-6 w-6 text-primary" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spending Trend</CardTitle>
          <CardDescription>Recent 7 day buying activity</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="buyerSpendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2f855a" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2f855a" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="spent" stroke="#2f855a" fill="url(#buyerSpendFill)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest order and payment status overview</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboard?.recent_orders?.length ? (
            <div className="space-y-3">
              {dashboard.recent_orders.slice(0, 5).map((order) => (
                <div key={order.id} className="border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{order.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.farmer_name} · {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">LKR {Number(order.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent orders.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BuyerDashboard;
