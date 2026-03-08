import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cartAPI, type CartItem } from "@/lib/api";

const DEFAULT_IMG = "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200";

const Cart = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [editQty, setEditQty] = useState<Record<number, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const buyerId = user?.id;

  useEffect(() => {
    if (buyerId) loadCart();
    else setLoading(false);
  }, [buyerId]);

  const loadCart = async () => {
    if (!buyerId) return;
    try {
      setLoading(true);
      const res = await cartAPI.getCart(buyerId);
      if (res.success && res.items) setItems(res.items);
      window.dispatchEvent(new CustomEvent("cart-updated"));
    } catch {
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const updateQty = async (productId: number, quantity: number) => {
    if (!buyerId) return;
    if (quantity < 1) {
      await removeItem(productId);
      return;
    }
    setUpdating(productId);
    try {
      const res = await cartAPI.updateCartItem(buyerId, productId, quantity);
      if (res.success) await loadCart();
      else toast.error(res.message);
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (productId: number) => {
    if (!buyerId) return;
    try {
      const res = await cartAPI.removeFromCart(buyerId, productId);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.product_id !== productId));
        toast.success("Removed from cart");
      } else toast.error(res.message);
    } catch {
      toast.error("Failed to remove");
    }
  };

  const handleCheckout = async () => {
    if (!buyerId) {
      toast.error("Please login to checkout");
      navigate("/login");
      return;
    }
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setCheckingOut(true);
    try {
      const res = await cartAPI.checkout(buyerId, paymentMethod);
      if (res.success) {
        toast.success(res.message || "Order placed!");
        setItems([]);
        navigate("/order-confirmation", { state: res });
      } else toast.error(res.message || "Checkout failed");
    } catch {
      toast.error("Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  const total = items.reduce((sum, i) => sum + i.price * i.cart_quantity, 0);

  if (!buyerId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground mb-4">Please log in as a buyer to view your cart.</p>
          <Button asChild>
            <Link to="/login">Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="gradient-hero text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Your Cart</h1>
          <p className="text-xl opacity-90">Review items and proceed to checkout</p>
        </div>
      </section>

      <section className="py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading cart...</p>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Your cart is empty.</p>
                <Button asChild>
                  <Link to="/marketplace">Browse Marketplace</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 mb-8">
              {items.map((item) => (
                <Card key={item.cart_item_id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <img
                      src={item.image_url || DEFAULT_IMG}
                      alt={item.name}
                      className="w-24 h-24 object-cover rounded-md"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.farmer_name} · {item.category}</p>
                      <p className="text-primary font-bold mt-1">LKR {item.price} / {item.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={item.available_quantity}
                        value={editQty[item.product_id] ?? item.cart_quantity}
                        onBlur={(e) => {
                          const v = Math.min(
                            item.available_quantity,
                            Math.max(1, Number(e.target.value) || 1)
                          );
                          setEditQty((prev) => {
                            const next = { ...prev };
                            delete next[item.product_id];
                            return next;
                          });
                          if (v !== item.cart_quantity) updateQty(item.product_id, v);
                        }}
                        onChange={(e) =>
                          setEditQty((prev) => ({
                            ...prev,
                            [item.product_id]: Math.max(1, Number(e.target.value) || 1),
                          }))
                        }
                        disabled={updating === item.product_id}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">{item.unit}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.product_id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="font-semibold whitespace-nowrap">
                      LKR {(item.price * item.cart_quantity).toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && (
            <Card className={items.length ? "" : "mt-6"}>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>Total: LKR {total.toFixed(2)}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="max-w-xs">
                  <p className="text-sm font-medium mb-2">Payment Method</p>
                  <Select
                    value={paymentMethod}
                    onValueChange={(value) => setPaymentMethod(value as "COD" | "ONLINE")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COD">Cash on Delivery (COD)</SelectItem>
                      <SelectItem value="ONLINE">Online (Demo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button asChild variant="outline">
                    <Link to="/marketplace">Continue Shopping</Link>
                  </Button>
                  <Button onClick={handleCheckout} disabled={checkingOut || items.length === 0}>
                    {checkingOut ? "Placing order..." : "Proceed to Checkout"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
};

export default Cart;

