import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Package, TrendingUp, Coins, Edit, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { productsAPI } from "@/lib/api";

interface Product {
  id: number;
  name: string;
  category: "Vegetable" | "Fruit";
  quality: "Organic" | "Premium" | "Standard";
  price: number;
  quantity: string;
  unit: string;
  available_quantity: number;
  image_url: string | null;
  description: string | null;
  status: string;
  created_at: string;
}

interface ProductFormData {
  name: string;
  category: "Vegetable" | "Fruit" | "";
  quality: "Organic" | "Premium" | "Standard" | "";
  price: string;
  unit: "kg" | "dozen" | "";
  available_quantity: string;
  image_url: string;
  description: string;
}

const FarmerDashboard = () => {
  // Get farmer ID from localStorage (set during login)
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const farmerId = user.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    category: "",
    quality: "",
    price: "",
    unit: "",
    available_quantity: "",
    image_url: "",
    description: "",
  });

  // Load products on component mount
  useEffect(() => {
    if (farmerId) {
      loadProducts();
    }
  }, [farmerId]);

  const loadProducts = async () => {
    if (!farmerId) {
      toast.error("Please login to view your products");
      return;
    }

    try {
      setLoading(true);
      const response = await productsAPI.getProducts(farmerId);
      if (response.success && response.products) {
        setProducts(response.products);
      } else {
        toast.error(response.message || "Failed to load products");
      }
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      quality: "",
      price: "",
      unit: "",
      available_quantity: "",
      image_url: "",
      description: "",
    });
    setEditingProduct(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      quality: product.quality,
      price: product.price.toString(),
      unit: product.unit as "kg" | "dozen",
      available_quantity: product.available_quantity.toString(),
      image_url: product.image_url || "",
      description: product.description || "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!farmerId) {
      toast.error("Please login to add products");
      return;
    }

    // Validate required fields
    if (!formData.name || !formData.category || !formData.quality || !formData.price || !formData.unit || !formData.available_quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      if (editingProduct) {
        // Update existing product
        const response = await productsAPI.updateProduct(editingProduct.id, {
          farmer_id: farmerId,
          name: formData.name,
          category: formData.category as "Vegetable" | "Fruit",
          quality: formData.quality as "Organic" | "Premium" | "Standard",
          price: parseFloat(formData.price),
          unit: formData.unit as "kg" | "dozen",
          available_quantity: parseFloat(formData.available_quantity),
          image_url: formData.image_url || undefined,
          description: formData.description || undefined,
        });

        if (response.success) {
          toast.success(response.message || "Product updated successfully!");
          resetForm();
          loadProducts();
        } else {
          toast.error(response.message || "Failed to update product");
        }
      } else {
        // Create new product
        const response = await productsAPI.createProduct({
          farmer_id: farmerId,
          name: formData.name,
          category: formData.category as "Vegetable" | "Fruit",
          quality: formData.quality as "Organic" | "Premium" | "Standard",
          price: parseFloat(formData.price),
          unit: formData.unit as "kg" | "dozen",
          available_quantity: parseFloat(formData.available_quantity),
          image_url: formData.image_url || undefined,
          description: formData.description || undefined,
        });

        if (response.success) {
          toast.success(response.message || "Product added successfully!");
          resetForm();
          loadProducts();
        } else {
          toast.error(response.message || "Failed to add product");
        }
      }
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: number) => {
    if (!farmerId) {
      toast.error("Please login to delete products");
      return;
    }

    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await productsAPI.deleteProduct(productId, farmerId);
      if (response.success) {
        toast.success(response.message || "Product deleted successfully!");
        loadProducts();
      } else {
        toast.error(response.message || "Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="gradient-hero text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Farmer Dashboard</h1>
          <p className="text-xl opacity-90">Manage your products and track your sales</p>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Products</p>
                    <p className="text-3xl font-bold">{products.length}</p>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Sales</p>
                    <p className="text-3xl font-bold">LKR 12,450</p>
                  </div>
                  <div className="bg-secondary/10 p-3 rounded-full">
                    <Coins className="h-6 w-6 text-secondary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Growth</p>
                    <p className="text-3xl font-bold">+23%</p>
                  </div>
                  <div className="bg-accent/10 p-3 rounded-full">
                    <TrendingUp className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="products" className="space-y-6">
            <TabsList>
              <TabsTrigger value="products">My Products</TabsTrigger>
              <TabsTrigger value="add" onClick={resetForm}>
                {editingProduct ? "Edit Product" : "Add Product"}
              </TabsTrigger>
              <TabsTrigger value="reports">Sales Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="products">
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Your Products</CardTitle>
                      <CardDescription>Manage your listed products</CardDescription>
                    </div>
                    <Button onClick={loadProducts} variant="outline" size="sm" disabled={loading}>
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading && !products.length ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Loading products...</p>
                    </div>
                  ) : products.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No products yet. Add your first product!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {products.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {product.image_url && (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-16 h-16 object-cover rounded-md"
                                />
                              )}
                              <div>
                                <h3 className="font-semibold text-lg">{product.name}</h3>
                                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                                  <span>Category: {product.category}</span>
                                  <span>Price: LKR {product.price}/{product.unit}</span>
                                  <span>Available: {product.available_quantity} {product.unit}</span>
                                  <span>Quality: {product.quality}</span>
                                </div>
                                {product.description && (
                                  <p className="text-sm text-muted-foreground mt-2">{product.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                handleEdit(product);
                                document.querySelector('[value="add"]')?.click();
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(product.id)}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="add">
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{editingProduct ? "Edit Product" : "Add New Product"}</CardTitle>
                      <CardDescription>
                        {editingProduct ? "Update product information" : "List a new product for sale"}
                      </CardDescription>
                    </div>
                    {editingProduct && (
                      <Button variant="ghost" size="sm" onClick={resetForm}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Product Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="e.g., Fresh Tomatoes"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => handleSelectChange("category", value)}
                          required
                        >
                          <SelectTrigger id="category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Vegetable">Vegetable</SelectItem>
                            <SelectItem value="Fruit">Fruit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quality">Quality *</Label>
                        <Select
                          value={formData.quality}
                          onValueChange={(value) => handleSelectChange("quality", value)}
                          required
                        >
                          <SelectTrigger id="quality">
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
                        <Label htmlFor="price">Price (LKR) *</Label>
                        <Input
                          id="price"
                          name="price"
                          type="number"
                          step="0.01"
                          placeholder="40.00"
                          value={formData.price}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit">Unit *</Label>
                        <Select
                          value={formData.unit}
                          onValueChange={(value) => handleSelectChange("unit", value)}
                          required
                        >
                          <SelectTrigger id="unit">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="dozen">dozen</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="available_quantity">Available Quantity *</Label>
                        <Input
                          id="available_quantity"
                          name="available_quantity"
                          type="number"
                          step="0.01"
                          placeholder="50"
                          value={formData.available_quantity}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="image_url">Product Image URL</Label>
                      <Input
                        id="image_url"
                        name="image_url"
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={formData.image_url}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <textarea
                        id="description"
                        name="description"
                        rows={4}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Enter product description..."
                        value={formData.description}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? (
                          "Saving..."
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            {editingProduct ? "Update Product" : "Add Product"}
                          </>
                        )}
                      </Button>
                      {editingProduct && (
                        <Button type="button" variant="outline" onClick={resetForm} disabled={loading}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Sales Analytics</CardTitle>
                  <CardDescription>Track your performance and earnings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Detailed sales reports and analytics will be displayed here
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
};

export default FarmerDashboard;



