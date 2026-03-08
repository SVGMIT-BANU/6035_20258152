import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buyerAPI } from "@/lib/api";
import { toast } from "sonner";

const BuyerProfile = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const buyerId = user?.id;
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await buyerAPI.getProfile(buyerId);
      if (res.success && res.profile) {
        setForm({
          name: res.profile.name || "",
          phone: res.profile.phone || "",
          email: res.profile.email || "",
        });
      } else toast.error(res.message || "Failed to load profile");
    };
    if (buyerId) load();
  }, [buyerId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await buyerAPI.updateProfile({
        buyer_id: buyerId,
        name: form.name,
        phone: form.phone,
      });
      if (res.success) toast.success("Profile updated");
      else toast.error(res.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Management</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={form.email} disabled />
          </div>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BuyerProfile;
