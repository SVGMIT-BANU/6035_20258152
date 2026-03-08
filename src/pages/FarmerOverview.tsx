import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { farmerAPI, type FarmerOverview as FarmerOverviewType } from "@/lib/api";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";

const FarmerOverview = () => {
  const { language } = useLanguage();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const farmerId = user?.id;
  const [overview, setOverview] = useState<FarmerOverviewType | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await farmerAPI.getOverview(farmerId);
      if (res.success && res.overview) setOverview(res.overview);
      else toast.error(res.message || "Failed to load farmer overview");
    };
    if (farmerId) load();
  }, [farmerId]);

  const labels = {
    en: {
      totalProducts: "Total Products",
      activeProducts: "Active Products",
      pendingProducts: "Pending Products",
      totalOrders: "Total Orders",
      pendingOrders: "Pending Orders",
      openComplaints: "Open Complaints",
      revenue: "Revenue",
    },
    ta: {
      totalProducts: "\u0bae\u0bca\u0ba4\u0bcd\u0ba4 \u0baa\u0bca\u0bb0\u0bc1\u0b9f\u0bcd\u0b95\u0bb3\u0bcd",
      activeProducts: "\u0b9a\u0bc6\u0baf\u0bb2\u0bbf\u0bb2\u0bcd \u0b89\u0bb3\u0bcd\u0bb3 \u0baa\u0bca\u0bb0\u0bc1\u0b9f\u0bcd\u0b95\u0bb3\u0bcd",
      pendingProducts: "\u0b95\u0bbe\u0ba4\u0bcd\u0ba4\u0bbf\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bc1\u0bae\u0bcd \u0baa\u0bca\u0bb0\u0bc1\u0b9f\u0bcd\u0b95\u0bb3\u0bcd",
      totalOrders: "\u0bae\u0bca\u0ba4\u0bcd\u0ba4 \u0b86\u0bb0\u0bcd\u0b9f\u0bb0\u0bcd\u0b95\u0bb3\u0bcd",
      pendingOrders: "\u0b95\u0bbe\u0ba4\u0bcd\u0ba4\u0bbf\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bc1\u0bae\u0bcd \u0b86\u0bb0\u0bcd\u0b9f\u0bb0\u0bcd\u0b95\u0bb3\u0bcd",
      openComplaints: "\u0ba4\u0bbf\u0bb1\u0ba8\u0bcd\u0ba4 \u0baa\u0bc1\u0b95\u0bbe\u0bb0\u0bcd\u0b95\u0bb3\u0bcd",
      revenue: "\u0bb5\u0bb0\u0bc1\u0bb5\u0bbe\u0baf\u0bcd",
    },
    si: {
      totalProducts: "\u0db8\u0dd4\u0dc5\u0dd4 \u0db1\u0dd2\u0dc2\u0dca\u0db4\u0dcf\u0daf\u0db1",
      activeProducts: "\u0dc3\u0d9a\u0dca\u0dbb\u0dd2\u0dba \u0db1\u0dd2\u0dc2\u0dca\u0db4\u0dcf\u0daf\u0db1",
      pendingProducts: "\u0db6\u0dbd\u0dcf\u0db4\u0ddc\u0dbb\u0ddc\u0dad\u0dca\u0dad\u0dd4 \u0db1\u0dd2\u0dc2\u0dca\u0db4\u0dcf\u0daf\u0db1",
      totalOrders: "\u0db8\u0dd4\u0dc5\u0dd4 \u0d87\u0dab\u0dc0\u0dd4\u0db8\u0dca",
      pendingOrders: "\u0db6\u0dbd\u0dcf\u0db4\u0ddc\u0dbb\u0ddc\u0dad\u0dca\u0dad\u0dd4 \u0d87\u0dab\u0dc0\u0dd4\u0db8\u0dca",
      openComplaints: "\u0dc0\u0dd2\u0dc0\u0dd8\u0dad \u0db4\u0dd0\u0db8\u0dd2\u0dab\u0dd2\u0dbd\u0dd2",
      revenue: "\u0d86\u0daf\u0dcf\u0dba\u0db8",
    },
  }[language];

  const stats = [
    [labels.totalProducts, overview?.total_products ?? 0],
    [labels.activeProducts, overview?.active_products ?? 0],
    [labels.pendingProducts, overview?.pending_products ?? 0],
    [labels.totalOrders, overview?.total_orders ?? 0],
    [labels.pendingOrders, overview?.pending_orders ?? 0],
    [labels.openComplaints, overview?.open_complaints ?? 0],
    [labels.revenue, `LKR ${(overview?.total_revenue ?? 0).toFixed(2)}`],
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {stats.map(([title, value]) => (
        <Card key={title}>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <CardTitle className="text-2xl">{value}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
      ))}
    </div>
  );
};

export default FarmerOverview;
