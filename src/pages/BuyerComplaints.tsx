import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buyerAPI, type BuyerComplaint, type BuyerOrder } from "@/lib/api";
import { toast } from "sonner";

const BuyerComplaints = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const buyerId = user?.id;
  const [complaints, setComplaints] = useState<BuyerComplaint[]>([]);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [form, setForm] = useState({ order_id: "", subject: "", message: "" });

  const load = async () => {
    const [complaintsRes, ordersRes] = await Promise.all([
      buyerAPI.getComplaints(buyerId),
      buyerAPI.getOrders(buyerId),
    ]);
    if (complaintsRes.success) setComplaints(complaintsRes.complaints || []);
    else toast.error(complaintsRes.message || "Failed to load complaints");
    if (ordersRes.success) setOrders(ordersRes.orders || []);
  };

  useEffect(() => {
    if (buyerId) load();
  }, [buyerId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.order_id || !form.subject || !form.message) {
      toast.error("Fill all complaint fields");
      return;
    }
    const res = await buyerAPI.addComplaint({
      buyer_id: buyerId,
      order_id: Number(form.order_id),
      subject: form.subject,
      message: form.message,
    });
    if (res.success) {
      toast.success("Complaint submitted");
      setForm({ order_id: "", subject: "", message: "" });
      load();
    } else toast.error(res.message || "Failed to submit complaint");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Raise Complaint</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3 max-w-xl" onSubmit={submit}>
            <div className="space-y-2">
              <Label>Order ID</Label>
              <Input
                list="buyer-orders-list"
                value={form.order_id}
                onChange={(e) => setForm((s) => ({ ...s, order_id: e.target.value }))}
                placeholder="Enter order id"
              />
              <datalist id="buyer-orders-list">
                {orders.map((o) => (
                  <option key={o.id} value={String(o.id)}>{o.product_name}</option>
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))}
                placeholder="Bad quality / delivery delay"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <textarea
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.message}
                onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
              />
            </div>
            <Button type="submit">Submit Complaint</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Complaint History</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">ID</th>
                <th className="text-left py-2">Order</th>
                <th className="text-left py-2">Subject</th>
                <th className="text-left py-2">Farmer</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Resolution</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="py-2">#{c.id}</td>
                  <td className="py-2">#{c.order_id}</td>
                  <td className="py-2">{c.subject}</td>
                  <td className="py-2">{c.farmer_name || "-"}</td>
                  <td className="py-2">{c.status}</td>
                  <td className="py-2">{c.resolution_note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default BuyerComplaints;
