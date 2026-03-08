import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { buyerAPI, cartAPI, productsAPI, type ProductDetails } from "@/lib/api";

const DEFAULT_IMG = "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=900";

interface ProductReview {
  id: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface CardDetails {
  holderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

const ProductDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const productId = Number(id);

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [processingBuyNow, setProcessingBuyNow] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [newRating, setNewRating] = useState("5");
  const [newComment, setNewComment] = useState("");
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    holderName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });

  const reviewStorageKey = `product_reviews_${productId}`;

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }
    loadProduct();
  }, [productId]);

  useEffect(() => {
    const stored = localStorage.getItem(reviewStorageKey);
    if (stored) {
      try {
        setReviews(JSON.parse(stored));
      } catch {
        setReviews([]);
      }
    } else {
      setReviews([]);
    }
  }, [reviewStorageKey]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const res = await productsAPI.getProduct(productId);
      if (res.success && res.product) {
        setProduct(res.product);
      } else {
        toast.error(res.message || "Product not found");
      }
    } catch {
      toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const saveReviews = (next: ProductReview[]) => {
    setReviews(next);
    localStorage.setItem(reviewStorageKey, JSON.stringify(next));
  };

  const validateBuyer = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?.id) {
      toast.error("Please login as buyer");
      navigate("/login");
      return null;
    }
    if (user.user_type !== "buyer") {
      toast.error("Only buyers can place orders");
      return null;
    }
    return user;
  };

  const validateOnlineCard = () => {
    const cardNumber = cardDetails.cardNumber.replace(/\s+/g, "");
    const expiryOk = /^\d{2}\/\d{2}$/.test(cardDetails.expiry.trim());
    const cvvOk = /^\d{3,4}$/.test(cardDetails.cvv.trim());
    if (!cardDetails.holderName.trim()) {
      toast.error("Card holder name is required");
      return false;
    }
    if (!/^\d{13,19}$/.test(cardNumber)) {
      toast.error("Enter a valid card number");
      return false;
    }
    if (!expiryOk) {
      toast.error("Expiry must be MM/YY");
      return false;
    }
    if (!cvvOk) {
      toast.error("Enter a valid CVV");
      return false;
    }
    return true;
  };

  const handleAddToCart = async () => {
    const user = validateBuyer();
    if (!user || !product) return;

    const maxQty = Math.max(0, Number(product.available_quantity) || 0);
    const qty = Math.min(Math.max(1, quantity), maxQty);
    if (qty > maxQty) {
      toast.error(`Only ${maxQty} available`);
      return;
    }

    setAddingToCart(true);
    try {
      const res = await cartAPI.addToCart(user.id, product.id, qty);
      if (res.success) {
        toast.success(res.message || "Added to cart");
        window.dispatchEvent(new CustomEvent("cart-updated"));
      } else {
        toast.error(res.message || "Failed to add to cart");
      }
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleSaveProduct = async () => {
    const user = validateBuyer();
    if (!user || !product) return;
    try {
      const res = await buyerAPI.addSavedProduct(user.id, product.id);
      if (res.success) {
        toast.success(res.message || "Saved");
      } else {
        toast.error(res.message || "Failed to save");
      }
    } catch {
      toast.error("Failed to save product");
    }
  };

  const handleBuyNow = async () => {
    const user = validateBuyer();
    if (!user || !product) return;

    const maxQty = Math.max(0, Number(product.available_quantity) || 0);
    const qty = Math.min(Math.max(1, quantity), maxQty);
    if (qty > maxQty) {
      toast.error(`Only ${maxQty} available`);
      return;
    }

    if (paymentMethod === "ONLINE" && !validateOnlineCard()) {
      return;
    }

    setProcessingBuyNow(true);
    try {
      const res = await cartAPI.buyNow(user.id, product.id, qty, paymentMethod);
      if (res.success) {
        toast.success(res.message || "Order placed");
        navigate("/order-confirmation", { state: res });
      } else {
        toast.error(res.message || "Buy now failed");
      }
    } catch {
      toast.error("Buy now failed");
    } finally {
      setProcessingBuyNow(false);
    }
  };

  const handleSubmitReview = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const name = user?.name || "Anonymous Buyer";
    if (!newComment.trim()) {
      toast.error("Write your comment");
      return;
    }
    const next: ProductReview[] = [
      {
        id: `${Date.now()}`,
        name,
        rating: Number(newRating),
        comment: newComment.trim(),
        createdAt: new Date().toISOString(),
      },
      ...reviews,
    ];
    saveReviews(next);
    setNewComment("");
    setNewRating("5");
    toast.success("Review added");
  };

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((acc, cur) => acc + cur.rating, 0);
    return sum / reviews.length;
  }, [reviews]);

  if (!productId || Number.isNaN(productId)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <p className="text-muted-foreground mb-4">Invalid product.</p>
          <Button asChild>
            <Link to="/marketplace">Back to Marketplace</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <p className="text-muted-foreground">Loading product...</p>
        ) : !product ? (
          <Card>
            <CardContent className="py-10">
              <p className="text-muted-foreground mb-4">Product not found.</p>
              <Button asChild>
                <Link to="/marketplace">Back to Marketplace</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <Card>
                <CardContent className="p-4">
                  <img
                    src={product.image_url || DEFAULT_IMG}
                    alt={product.name}
                    className="w-full h-[360px] object-cover rounded-md"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{product.category}</Badge>
                    <Badge>{product.quality}</Badge>
                  </div>
                  <CardTitle className="text-3xl">{product.name}</CardTitle>
                  <CardDescription>
                    Seller: {product.farmer_name} | Available: {product.available_quantity} {product.unit}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-3xl font-bold text-primary">LKR {product.price} / {product.unit}</p>
                  <p className="text-sm text-muted-foreground">
                    {product.description || "Fresh produce from local farmer."}
                  </p>

                  <div className="flex items-center gap-3">
                    <Label htmlFor="qty">Quantity</Label>
                    <Input
                      id="qty"
                      type="number"
                      min={1}
                      max={Math.max(1, Number(product.available_quantity) || 1)}
                      className="w-24"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button onClick={handleBuyNow} disabled={processingBuyNow}>
                      {processingBuyNow ? "Processing..." : "Buy Now"}
                    </Button>
                    <Button variant="outline" onClick={handleAddToCart} disabled={addingToCart}>
                      {addingToCart ? "Adding..." : "Add to Cart"}
                    </Button>
                    <Button variant="secondary" onClick={handleSaveProduct} className="sm:col-span-2">
                      Save Product
                    </Button>
                  </div>

                  <div className="space-y-3 border rounded-md p-4">
                    <p className="font-medium">Payment Method</p>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "COD" | "ONLINE")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COD">Cash on Delivery (COD)</SelectItem>
                        <SelectItem value="ONLINE">Online Payment</SelectItem>
                      </SelectContent>
                    </Select>

                    {paymentMethod === "ONLINE" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <Label className="mb-1 block">Card Holder Name</Label>
                          <Input
                            value={cardDetails.holderName}
                            onChange={(e) => setCardDetails((p) => ({ ...p, holderName: e.target.value }))}
                            placeholder="Name on card"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="mb-1 block">Card Number</Label>
                          <Input
                            value={cardDetails.cardNumber}
                            onChange={(e) => setCardDetails((p) => ({ ...p, cardNumber: e.target.value }))}
                            placeholder="1234123412341234"
                          />
                        </div>
                        <div>
                          <Label className="mb-1 block">Expiry (MM/YY)</Label>
                          <Input
                            value={cardDetails.expiry}
                            onChange={(e) => setCardDetails((p) => ({ ...p, expiry: e.target.value }))}
                            placeholder="12/28"
                          />
                        </div>
                        <div>
                          <Label className="mb-1 block">CVV</Label>
                          <Input
                            type="password"
                            value={cardDetails.cvv}
                            onChange={(e) => setCardDetails((p) => ({ ...p, cvv: e.target.value }))}
                            placeholder="123"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Ratings & Comments</CardTitle>
                <CardDescription>
                  {reviews.length
                    ? `${avgRating.toFixed(1)} / 5 (${reviews.length} reviews)`
                    : "No reviews yet"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <Label className="mb-1 block">Rating</Label>
                    <Select value={newRating} onValueChange={setNewRating}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="mb-1 block">Comment</Label>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Share your review..."
                    />
                  </div>
                  <Button onClick={handleSubmitReview}>Post</Button>
                </div>

                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Be the first to review this product.</p>
                  ) : (
                    reviews.map((review) => (
                      <div key={review.id} className="border rounded-md p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">{review.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm">{review.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductDetailsPage;
