import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buyerAPI, type BuyerPayment } from "@/lib/api";
import { toast } from "sonner";

const BuyerPayments = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const buyerId = user?.id;
  const [payments, setPayments] = useState<BuyerPayment[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await buyerAPI.getPayments(buyerId);
      if (res.success) setPayments(res.payments || []);
      else toast.error(res.message || "Failed to load payments");
    };
    if (buyerId) load();
  }, [buyerId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Order</th>
              <th className="text-left py-2">Method</th>
              <th className="text-left py-2">Payment Status</th>
              <th className="text-left py-2">Order Status</th>
              <th className="text-left py-2">Transaction</th>
              <th className="text-left py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.order_id} className="border-b">
                <td className="py-2">#{p.order_id}</td>
                <td className="py-2">{p.payment_method}</td>
                <td className="py-2">{p.payment_status}</td>
                <td className="py-2">{p.status}</td>
                <td className="py-2">{p.transaction_id || "-"}</td>
                <td className="py-2">LKR {Number(p.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default BuyerPayments;
