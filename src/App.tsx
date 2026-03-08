import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RegisterVerify from "./pages/RegisterVerify";
import Marketplace from "./pages/Marketplace";
import Cart from "./pages/Cart";
import FarmerLayout from "./components/FarmerLayout";
import FarmerOverview from "./pages/FarmerOverview";
import FarmerProfile from "./pages/FarmerProfile";
import FarmerProducts from "./pages/FarmerProducts";
import FarmerOrders from "./pages/FarmerOrders";
import FarmerReports from "./pages/FarmerReports";
import FarmerComplaints from "./pages/FarmerComplaints";
import BuyerDashboard from "./pages/BuyerDashboard";
import BuyerLayout from "./components/BuyerLayout";
import BuyerProfile from "./pages/BuyerProfile";
import BuyerOrders from "./pages/BuyerOrders";
import BuyerPayments from "./pages/BuyerPayments";
import BuyerComplaints from "./pages/BuyerComplaints";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminFarmers from "./pages/AdminFarmers";
import AdminProducts from "./pages/AdminProducts";
import AdminOrders from "./pages/AdminOrders";
import AdminPayments from "./pages/AdminPayments";
import AdminReports from "./pages/AdminReports";
import PricePrediction from "./pages/PricePrediction";
import ProductDetails from "./pages/ProductDetails";
import OrderConfirmation from "./pages/OrderConfirmation";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/AdminLayout";
import { LanguageProvider } from "./components/LanguageProvider";
import FarmerVoiceAgent from "./components/FarmerVoiceAgent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <FarmerVoiceAgent />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register-verify" element={<RegisterVerify />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/order-confirmation" element={<OrderConfirmation />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/farmer-dashboard" element={<FarmerLayout />}>
              <Route index element={<FarmerOverview />} />
              <Route path="profile" element={<FarmerProfile />} />
              <Route path="products" element={<FarmerProducts />} />
              <Route path="orders" element={<FarmerOrders />} />
              <Route path="reports" element={<FarmerReports />} />
              <Route path="complaints" element={<FarmerComplaints />} />
            </Route>
            <Route path="/buyer-dashboard" element={<BuyerLayout />}>
              <Route index element={<BuyerDashboard />} />
              <Route path="profile" element={<BuyerProfile />} />
              <Route path="orders" element={<BuyerOrders />} />
              <Route path="payments" element={<BuyerPayments />} />
              <Route path="complaints" element={<BuyerComplaints />} />
            </Route>
            <Route path="/admin-dashboard" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="farmers" element={<AdminFarmers />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="reports" element={<AdminReports />} />
            </Route>
            <Route path="/price-prediction" element={<PricePrediction />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
