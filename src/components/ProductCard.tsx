import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { ShoppingCart, User } from "lucide-react";
import { toast } from "sonner";
import { cartAPI } from "@/lib/api";
import type { ProductMarketplace } from "@/lib/api";
import fruitsImage from "@/assets/fruits.jpg";
import vegetablesImage from "@/assets/vegetables.jpg";

const DEFAULT_FRUIT_IMG = fruitsImage;
const DEFAULT_VEGETABLE_IMG = vegetablesImage;

interface ProductCardProps {
  product?: ProductMarketplace | null;
  onAddedToCart?: () => void;
}

const ProductCard = ({ product, onAddedToCart }: ProductCardProps) => {
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  if (!product) {
    return null;
  }

  const qualityColors = {
    Premium: "bg-accent text-accent-foreground",
    Standard: "bg-secondary text-secondary-foreground",
    Organic: "bg-primary text-primary-foreground",
  };
  const fallbackImage = product.category === "Fruit" ? DEFAULT_FRUIT_IMG : DEFAULT_VEGETABLE_IMG;
  const image = product.image_url || fallbackImage;
  const maxQty = Math.max(0, Number(product.available_quantity) || 0);

  const handleAddToCart = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?.id) {
      toast.error("Please login to add to cart");
      return;
    }
    if (user.user_type !== "buyer") {
      toast.error("Only buyers can add to cart");
      return;
    }
    const qty = Math.min(Math.max(1, quantity), maxQty);
    if (qty > maxQty) {
      toast.error(`Only ${maxQty} available`);
      return;
    }
    setAdding(true);
    try {
      const res = await cartAPI.addToCart(user.id, product.id, qty);
      if (res.success) {
        toast.success(res.message || "Added to cart");
        onAddedToCart?.();
        window.dispatchEvent(new CustomEvent("cart-updated"));
      } else toast.error(res.message || "Failed to add to cart");
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card className="group hover:shadow-soft transition-all duration-300 overflow-hidden">
      <CardHeader className="p-0">
        <Link to={`/product/${product.id}`} className="block">
          <div className="relative overflow-hidden aspect-video">
            <img
              src={image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <Badge className={`absolute top-2 right-2 ${qualityColors[product.quality as keyof typeof qualityColors] || ""}`}>
              {product.quality}
            </Badge>
            <Badge variant="outline" className="absolute top-2 left-2 bg-card">
              {product.category}
            </Badge>
          </div>
        </Link>
      </CardHeader>
      <CardContent className="p-4">
        <Link to={`/product/${product.id}`} className="hover:text-primary transition-colors">
          <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <User className="h-4 w-4" />
          <span>{product.farmer_name}</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-2xl font-bold text-primary">LKR {product.price}</p>
            <p className="text-xs text-muted-foreground">per {product.unit}</p>
          </div>
          <span className="text-sm text-muted-foreground">
            Available: {maxQty} {product.unit}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Qty</Label>
          <Input
            type="number"
            min={1}
            max={maxQty}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            className="h-9 w-20"
          />
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="w-full grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/product/${product.id}`}>View</Link>
          </Button>
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={adding || maxQty < 1}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {adding ? "Adding..." : "Add to Cart"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;

