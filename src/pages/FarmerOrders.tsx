import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { farmerAPI, type FarmerOrder } from "@/lib/api";
import { toast } from "sonner";

const ORDER_STATUSES = ["Pending", "Confirmed", "Out for Delivery", "Delivered", "Cancelled"];

const FarmerOrders = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const farmerId = user?.id;
  const [orders, setOrders] = useState<FarmerOrder[]>([]);

  const load = async () => {
    const res = await farmerAPI.getOrders(farmerId);
    if (res.success) setOrders(res.orders || []);
    else toast.error(res.message || "Failed to load orders");
  };

  useEffect(() => {
    if (farmerId) load();
  }, [farmerId]);

  const updateStatus = async (orderId: number, status: string) => {
    const res = await farmerAPI.updateOrderStatus(farmerId, orderId, status);
    if (res.success) {
      toast.success("Order status updated");
      load();
    } else toast.error(res.message || "Failed to update order");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders Management</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Order</th>
              <th className="text-left py-2">Product</th>
              <th className="text-left py-2">Buyer</th>
              <th className="text-left py-2">Amount</th>
              <th className="text-left py-2">Status</th>
              <th className="text-left py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b">
                <td className="py-2">#{o.id}</td>
                <td className="py-2">{o.product_name}</td>
                <td className="py-2">{o.buyer_name}</td>
                <td className="py-2">LKR {Number(o.amount).toFixed(2)}</td>
                <td className="py-2">{o.status}</td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-2">
                    {ORDER_STATUSES.map((s) => (
                      <Button key={s} size="sm" variant="outline" onClick={() => updateStatus(o.id, s)}>
                        {s}
                      </Button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default FarmerOrders;
