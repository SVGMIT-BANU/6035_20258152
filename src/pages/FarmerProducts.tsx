import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { productsAPI } from "@/lib/api";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FarmerProduct {
  id: number;
  name: string;
  category: string;
  quality: string;
  price: number;
  unit: string;
  available_quantity: number;
  status: string;
  approval_status?: string;
}

interface ProductFormState {
  name: string;
  category: "Vegetable" | "Fruit" | "";
  quality: "Organic" | "Premium" | "Standard" | "";
  price: string;
  unit: "kg" | "dozen" | "";
  available_quantity: string;
  image_url: string;
}

const FarmerProducts = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const farmerId = user?.id;
  const [products, setProducts] = useState<FarmerProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FarmerProduct | null>(null);
  const [form, setForm] = useState<ProductFormState>({
    name: "",
    category: "",
    quality: "",
    price: "",
    unit: "",
    available_quantity: "",
    image_url: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await productsAPI.getProducts(farmerId);
    if (res.success && res.products) setProducts(res.products as FarmerProduct[]);
    else toast.error(res.message || "Failed to load products");
    setLoading(false);
  }, [farmerId]);

  useEffect(() => {
    if (farmerId) load();
  }, [farmerId, load]);

  const resetForm = () => {
    setForm({
      name: "",
      category: "",
      quality: "",
      price: "",
      unit: "",
      available_quantity: "",
      image_url: "",
    });
    setEditingProduct(null);
  };

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category || !form.quality || !form.price || !form.unit || !form.available_quantity) {
      toast.error("Please fill all required fields");
      return;
    }

    if (editingProduct) {
      const res = await productsAPI.updateProduct(editingProduct.id, {
        farmer_id: farmerId,
        name: form.name,
        category: form.category as "Vegetable" | "Fruit",
        quality: form.quality as "Organic" | "Premium" | "Standard",
        price: Number(form.price),
        unit: form.unit as "kg" | "dozen",
        available_quantity: Number(form.available_quantity),
        image_url: form.image_url || undefined,
      });
      if (res.success) {
        toast.success("Product updated");
        resetForm();
        load();
      } else {
        toast.error(res.message || "Failed to update product");
      }
      return;
    }

    const res = await productsAPI.createProduct({
      farmer_id: farmerId,
      name: form.name,
      category: form.category as "Vegetable" | "Fruit",
      quality: form.quality as "Organic" | "Premium" | "Standard",
      price: Number(form.price),
      unit: form.unit as "kg" | "dozen",
      available_quantity: Number(form.available_quantity),
      image_url: form.image_url || undefined,
    });
    if (res.success) {
      toast.success("Product added and submitted for admin approval");
      resetForm();
      load();
    } else {
      toast.error(res.message || "Failed to add product");
    }
  };

  const editProduct = (product: FarmerProduct) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      category: (product.category as "Vegetable" | "Fruit") || "Vegetable",
      quality: (product.quality as "Organic" | "Premium" | "Standard") || "Standard",
      price: String(product.price),
      unit: (product.unit as "kg" | "dozen") || "kg",
      available_quantity: String(product.available_quantity),
      image_url: "",
    });
  };

  const toggleStatus = async (product: FarmerProduct) => {
    const nextStatus = product.status === "Active" ? "Inactive" : "Active";
    const res = await productsAPI.updateProduct(product.id, {
      farmer_id: farmerId,
      status: nextStatus,
    });
    if (res.success) {
      toast.success(`Product ${nextStatus === "Inactive" ? "disabled" : "enabled"}`);
      load();
    } else {
      toast.error(res.message || "Failed to update availability");
    }
  };

  const deleteProduct = async (productId: number) => {
    if (!confirm("Delete this product?")) return;
    const res = await productsAPI.deleteProduct(productId, farmerId);
    if (res.success) {
      toast.success("Product deleted");
      if (editingProduct?.id === productId) resetForm();
      load();
    } else {
      toast.error(res.message || "Failed to delete product");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingProduct ? "Update Product" : "Add New Product"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitProduct} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm((s) => ({ ...s, category: value as "Vegetable" | "Fruit" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vegetable">Vegetable</SelectItem>
                  <SelectItem value="Fruit">Fruit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quality *</Label>
              <Select
                value={form.quality}
                onValueChange={(value) =>
                  setForm((s) => ({ ...s, quality: value as "Organic" | "Premium" | "Standard" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Organic">Organic</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Price (LKR) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Unit *</Label>
              <Select
                value={form.unit}
                onValueChange={(value) =>
                  setForm((s) => ({ ...s, unit: value as "kg" | "dozen" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="dozen">dozen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.available_quantity}
                onChange={(e) => setForm((s) => ({ ...s, available_quantity: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Upload Image (URL)</Label>
              <Input
                type="url"
                placeholder="https://example.com/product.jpg"
                value={form.image_url}
                onChange={(e) => setForm((s) => ({ ...s, image_url: e.target.value }))}
              />
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              <Button type="submit" className="w-full">
                {editingProduct ? "Update Product" : "Add Product"}
              </Button>
              {editingProduct && (
                <Button type="button" variant="outline" className="w-full" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Products</CardTitle>
            <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Category</th>
                <th className="text-left py-2">Price</th>
                <th className="text-left py-2">Qty</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Approval</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2">{p.category}</td>
                  <td className="py-2">LKR {Number(p.price).toFixed(2)}</td>
                  <td className="py-2">{p.available_quantity} {p.unit}</td>
                  <td className="py-2">{p.status}</td>
                  <td className="py-2">{p.approval_status || "-"}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => editProduct(p)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleStatus(p)}>
                        {p.status === "Active" ? "Disable" : "Enable"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteProduct(p.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmerProducts;
