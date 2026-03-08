import { useEffect, useState } from "react";
import { adminAPI, type AdminOrder } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const AdminOrders = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await adminAPI.getOrders({ limit: "100" });
      if (res.success) setOrders(res.orders || []);
      else toast.error(res.message || "Failed to load orders");
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Monitoring</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Order</th>
              <th className="text-left py-2">Product</th>
              <th className="text-left py-2">Buyer</th>
              <th className="text-left py-2">Farmer</th>
              <th className="text-left py-2">Amount</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b">
                <td className="py-2">#{o.id}</td>
                <td className="py-2">{o.product_name}</td>
                <td className="py-2">{o.buyer_name}</td>
                <td className="py-2">{o.farmer_name}</td>
                <td className="py-2">LKR {Number(o.amount).toFixed(2)}</td>
                <td className="py-2">{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default AdminOrders;
