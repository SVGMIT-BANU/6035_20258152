import { useEffect, useState } from "react";
import { adminAPI, type AdminUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const AdminFarmers = () => {
  const [farmers, setFarmers] = useState<AdminUser[]>([]);

  const load = async () => {
    const res = await adminAPI.getFarmers();
    if (res.success) setFarmers(res.farmers || []);
    else toast.error(res.message || "Failed to load farmers");
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id: number, approval: "Approved" | "Rejected" | "Pending") => {
    const res = await adminAPI.updateFarmerApproval(id, approval);
    if (res.success) {
      toast.success(res.message);
      load();
    } else toast.error(res.message);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Farmer Approval</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Farmer</th>
              <th className="text-left py-2">Email</th>
              <th className="text-left py-2">Approval</th>
              <th className="text-left py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {farmers.map((f) => (
              <tr key={f.id} className="border-b">
                <td className="py-2">{f.name}</td>
                <td className="py-2">{f.email || "-"}</td>
                <td className="py-2">{f.approval_status}</td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => act(f.id, "Approved")}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => act(f.id, "Rejected")}>Reject</Button>
                    <Button size="sm" variant="outline" onClick={() => act(f.id, "Pending")}>Pending</Button>
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

export default AdminFarmers;
