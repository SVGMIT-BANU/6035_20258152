import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { farmerAPI, type FarmerDocument } from "@/lib/api";
import { toast } from "sonner";

const FarmerProfile = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const farmerId = user?.id;
  const [form, setForm] = useState({ name: "", phone: "", email: "", farm_location: "" });
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<FarmerDocument[]>([]);
  const [docForm, setDocForm] = useState({ document_name: "", document_url: "" });
  const [uploading, setUploading] = useState(false);

  const loadDocuments = async () => {
    const res = await farmerAPI.getDocuments(farmerId);
    if (res.success) setDocuments(res.documents || []);
    else toast.error(res.message || "Failed to load documents");
  };

  useEffect(() => {
    const load = async () => {
      const res = await farmerAPI.getProfile(farmerId);
      if (res.success && res.profile) {
        setForm({
          name: res.profile.name || "",
          phone: res.profile.phone || "",
          email: res.profile.email || "",
          farm_location: res.profile.farm_location || "",
        });
      } else toast.error(res.message || "Failed to load profile");
    };
    if (farmerId) {
      load();
      loadDocuments();
    }
  }, [farmerId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await farmerAPI.updateProfile({ farmer_id: farmerId, ...form });
      if (res.success) toast.success("Profile updated");
      else toast.error(res.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const uploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.document_name || !docForm.document_url) {
      toast.error("Document name and URL required");
      return;
    }
    try {
      setUploading(true);
      const res = await farmerAPI.uploadDocument({
        farmer_id: farmerId,
        document_name: docForm.document_name,
        document_url: docForm.document_url,
      });
      if (res.success) {
        toast.success("Document uploaded for admin verification");
        setDocForm({ document_name: "", document_url: "" });
        loadDocuments();
      } else toast.error(res.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Management</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={form.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farm_location">Farm Location</Label>
              <Input
                id="farm_location"
                value={form.farm_location}
                onChange={(e) => setForm((s) => ({ ...s, farm_location: e.target.value }))}
              />
            </div>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Documents (Admin Verification)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={uploadDocument}>
            <Input
              placeholder="Document name (NIC, Farm License...)"
              value={docForm.document_name}
              onChange={(e) => setDocForm((s) => ({ ...s, document_name: e.target.value }))}
            />
            <Input
              placeholder="Document URL"
              value={docForm.document_url}
              onChange={(e) => setDocForm((s) => ({ ...s, document_url: e.target.value }))}
            />
            <Button type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Document</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Uploaded</th>
                  <th className="text-left py-2">Link</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-b">
                    <td className="py-2">{d.document_name}</td>
                    <td className="py-2">{d.verification_status}</td>
                    <td className="py-2">{new Date(d.created_at).toLocaleString()}</td>
                    <td className="py-2">
                      <a className="text-primary underline" href={d.document_url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    </td>
                  </tr>
                ))}
                {!documents.length && (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={4}>No documents uploaded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmerProfile;
