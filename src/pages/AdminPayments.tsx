import { useEffect, useState } from "react";
import { adminAPI, type AdminPayment } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const AdminPayments = () => {
  const [payments, setPayments] = useState<AdminPayment[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await adminAPI.getPayments({ limit: "100" });
      if (res.success) setPayments(res.payments || []);
      else toast.error(res.message || "Failed to load payments");
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Monitoring</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Order</th>
              <th className="text-left py-2">Buyer</th>
              <th className="text-left py-2">Method</th>
              <th className="text-left py-2">Status</th>
              <th className="text-left py-2">Transaction</th>
              <th className="text-left py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.order_id} className="border-b">
                <td className="py-2">#{p.order_id}</td>
                <td className="py-2">{p.buyer_name}</td>
                <td className="py-2">{p.payment_method}</td>
                <td className="py-2">{p.payment_status}</td>
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

export default AdminPayments;
