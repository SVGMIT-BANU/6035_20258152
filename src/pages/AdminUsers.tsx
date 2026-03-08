import { useCallback, useEffect, useState } from "react";
import { adminAPI, type AdminUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const AdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getUsers({ q });
      if (res.success) setUsers(res.users || []);
      else toast.error(res.message || "Failed to load users");
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (id: number, status: "Active" | "Blocked") => {
    const res = await adminAPI.updateUserStatus(id, status);
    if (res.success) {
      toast.success(res.message);
      load();
    } else toast.error(res.message);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name/email/phone" />
          <Button onClick={load} disabled={loading}>Search</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">User</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Approval</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="py-2">{u.name}</td>
                  <td className="py-2">{u.user_type}</td>
                  <td className="py-2">{u.account_status}</td>
                  <td className="py-2">{u.approval_status}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => changeStatus(u.id, "Active")}>Activate</Button>
                      <Button size="sm" variant="destructive" onClick={() => changeStatus(u.id, "Blocked")}>Block</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminUsers;
