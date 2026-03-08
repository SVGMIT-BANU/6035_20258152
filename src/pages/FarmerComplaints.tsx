import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { farmerAPI, type FarmerComplaint } from "@/lib/api";
import { toast } from "sonner";

const FarmerComplaints = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const farmerId = user?.id;
  const [complaints, setComplaints] = useState<FarmerComplaint[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const load = async () => {
    const res = await farmerAPI.getComplaints(farmerId);
    if (res.success) setComplaints(res.complaints || []);
    else toast.error(res.message || "Failed to load complaints");
  };

  useEffect(() => {
    if (farmerId) load();
  }, [farmerId]);

  const resolve = async (id: number) => {
    const res = await farmerAPI.resolveComplaint(farmerId, id, notes[id] || "");
    if (res.success) {
      toast.success("Complaint resolved");
      load();
    } else toast.error(res.message || "Failed to resolve complaint");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complaints</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {complaints.length === 0 ? (
          <p className="text-sm text-muted-foreground">No complaints yet.</p>
        ) : (
          complaints.map((c) => (
            <div key={c.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{c.subject}</p>
                <span className="text-xs px-2 py-1 rounded bg-accent">{c.status}</span>
              </div>
              <p className="text-sm text-muted-foreground">{c.message}</p>
              <p className="text-xs text-muted-foreground">
                Buyer: {c.buyer_name || "-"} | Order: {c.order_id || "-"}
              </p>
              {c.status !== "Resolved" && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Resolution note"
                    value={notes[c.id] || ""}
                    onChange={(e) => setNotes((s) => ({ ...s, [c.id]: e.target.value }))}
                  />
                  <Button onClick={() => resolve(c.id)}>Resolve</Button>
                </div>
              )}
              {c.resolution_note && <p className="text-sm">Resolution: {c.resolution_note}</p>}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default FarmerComplaints;
