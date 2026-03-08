import { useEffect, useState } from "react";
import { adminAPI, type AdminProduct } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const AdminProducts = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);

  const load = async () => {
    const res = await adminAPI.getProducts();
    if (res.success) setProducts(res.products || []);
    else toast.error(res.message || "Failed to load products");
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id: number, approval: "Approved" | "Rejected" | "Pending") => {
    const res = await adminAPI.updateProductApproval(id, approval);
    if (res.success) {
      toast.success(res.message);
      load();
    } else toast.error(res.message);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Approval</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Product</th>
              <th className="text-left py-2">Farmer</th>
              <th className="text-left py-2">Price</th>
              <th className="text-left py-2">Approval</th>
              <th className="text-left py-2">Status</th>
              <th className="text-left py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.name}</td>
                <td className="py-2">{p.farmer_name}</td>
                <td className="py-2">LKR {Number(p.price).toFixed(2)}</td>
                <td className="py-2">{p.approval_status}</td>
                <td className="py-2">{p.status}</td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => act(p.id, "Approved")}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => act(p.id, "Rejected")}>Reject</Button>
                    <Button size="sm" variant="outline" onClick={() => act(p.id, "Pending")}>Pending</Button>
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

export default AdminProducts;
