import { Link, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OrderConfirmationPayload } from "@/lib/api";

const OrderConfirmation = () => {
  const location = useLocation();
  const data = (location.state || {}) as OrderConfirmationPayload;

  const orderRefs = data.order_references?.length
    ? data.order_references
    : data.order_reference
      ? [data.order_reference]
      : data.order_ids?.map((id) => `FM${String(id).padStart(5, "0")}`) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Order Placed Successfully</CardTitle>
            <CardDescription>Your payment/order details are below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {orderRefs.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Order ID</p>
                <p className="font-medium">{orderRefs.join(", ")}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Payment Method</p>
                <p className="font-medium">{data.payment_method || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Payment Status</p>
                <Badge variant={data.payment_status === "PAID" ? "default" : "secondary"}>
                  {data.payment_status || "-"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                <p className="font-medium">
                  {typeof data.total_amount === "number" ? `LKR ${data.total_amount.toFixed(2)}` : "-"}
                </p>
              </div>
              {data.transaction_id && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Transaction ID</p>
                  <p className="font-medium">{data.transaction_id}</p>
                </div>
              )}
            </div>

            {data.payment_method === "COD" && typeof data.total_amount === "number" && (
              <p className="text-sm bg-muted p-3 rounded-md">
                Please keep LKR {data.total_amount.toFixed(2)} ready at delivery time.
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild>
                <Link to="/marketplace">Continue Shopping</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/buyer-dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderConfirmation;
