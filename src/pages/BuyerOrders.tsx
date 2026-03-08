import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buyerAPI, type BuyerOrder } from "@/lib/api";
import { toast } from "sonner";

const BuyerOrders = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const buyerId = user?.id;
  const [orders, setOrders] = useState<BuyerOrder[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await buyerAPI.getOrders(buyerId);
      if (res.success) setOrders(res.orders || []);
      else toast.error(res.message || "Failed to load orders");
    };
    if (buyerId) load();
  }, [buyerId]);

  const raiseComplaint = (order: BuyerOrder) => {
    const subject = "Order Issue";
    const message = `Issue raised for order #${order.id} - ${order.product_name}`;
    buyerAPI.addComplaint({
      buyer_id: buyerId,
      order_id: order.id,
      subject,
      message,
    }).then((res) => {
      if (res.success) toast.success("Complaint submitted");
      else toast.error(res.message || "Failed to submit complaint");
    });
  };

  const downloadCsv = () => {
    const rows = [
      ["Order ID", "Product", "Quantity", "Amount", "Payment", "Status", "Created At"],
      ...orders.map((order) => [
        String(order.id),
        order.product_name,
        String(order.quantity),
        Number(order.amount).toFixed(2),
        `${order.payment_method} / ${order.payment_status}`,
        order.status,
        new Date(order.created_at).toLocaleString(),
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "buyer-orders-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Orders & Tracking</CardTitle>
          <Button variant="secondary" onClick={downloadCsv} disabled={orders.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Order ID</th>
              <th className="text-left py-2">Product</th>
              <th className="text-left py-2">Qty</th>
              <th className="text-left py-2">Amount</th>
              <th className="text-left py-2">Payment</th>
              <th className="text-left py-2">Status</th>
              <th className="text-left py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b">
                <td className="py-2">#{o.id}</td>
                <td className="py-2">{o.product_name}</td>
                <td className="py-2">{o.quantity}</td>
                <td className="py-2">LKR {Number(o.amount).toFixed(2)}</td>
                <td className="py-2">{o.payment_method} / {o.payment_status}</td>
                <td className="py-2">{o.status}</td>
                <td className="py-2">
                  <Button size="sm" variant="outline" onClick={() => raiseComplaint(o)}>
                    Raise Complaint
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default BuyerOrders;
