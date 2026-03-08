/**
 * API configuration and utility functions for backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * API client for making requests to the backend
 */
export const api = {
  baseURL: API_BASE_URL,

  /**
   * Make a request to the API
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: `HTTP error! status: ${response.status}`,
        }));
        throw new Error(error.message || "Request failed");
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Network error: Failed to connect to server");
    }
  },

  /**
   * POST request helper
   */
  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * GET request helper
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "GET",
    });
  },
};

/**
 * Authentication API endpoints
 */
export const authAPI = {
  /**
   * Register a new user
   */
  async register(data: {
    name: string;
    email?: string;
    phone?: string;
    password: string;
    confirmPassword?: string;
    user_type: "farmer" | "buyer" | "admin";
    verification_type?: "email" | "phone";
    verification_token?: string;
  }) {
    return api.post<{
      success: boolean;
      message: string;
      user_id?: number;
      user_type?: string;
    }>("/api/register", data);
  },

  async sendOtp(data: {
    identifier_type: "email" | "phone";
    identifier: string;
  }) {
    return api.post<{
      success: boolean;
      message: string;
      expires_in?: number;
    }>("/api/auth/send-otp", data);
  },

  async verifyOtp(data: {
    identifier_type: "email" | "phone";
    identifier: string;
    otp: string;
  }) {
    return api.post<{
      success: boolean;
      message: string;
      verification_token?: string;
      expires_in?: number;
    }>("/api/auth/verify-otp", data);
  },

  /**
   * Login a user
   */
  async login(data: {
    email: string;
    password: string;
    user_type?: "farmer" | "buyer" | "admin";
  }) {
    return api.post<{
      success: boolean;
      message: string;
      user?: {
        id: number;
        name: string;
        email: string;
        phone: string;
        user_type: string;
      };
    }>("/api/login", data);
  },

  /**
   * Health check
   */
  async health() {
    return api.get<{ status: string; message: string }>("/api/health");
  },
};

/** Product type from API */
export interface ProductMarketplace {
  id: number;
  farmer_id: number;
  name: string;
  category: string;
  quality: string;
  price: number;
  quantity: string;
  unit: string;
  available_quantity: number;
  image_url: string | null;
  description: string | null;
  status: string;
  created_at: string;
  farmer_name: string;
}

export type ProductDetails = ProductMarketplace;

/** Cart item with product details */
export interface CartItem {
  cart_item_id: number;
  product_id: number;
  cart_quantity: number;
  name: string;
  category: string;
  quality: string;
  price: number;
  unit: string;
  available_quantity: number;
  image_url: string | null;
  farmer_id: number;
  farmer_name: string;
}

export interface BuyerOrder {
  id: number;
  product_name: string;
  farmer_name: string;
  quantity: number;
  amount: number;
  status: string;
  payment_method: string;
  payment_status: string;
  transaction_id?: string | null;
  created_at: string;
}

export interface BuyerDashboardData {
  stats: {
    total_orders: number;
    total_spent: number;
    pending_orders: number;
    saved_items: number;
  };
  saved_products: ProductMarketplace[];
  recent_orders: BuyerOrder[];
}

export interface BuyerProfile {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface BuyerPayment {
  order_id: number;
  amount: number;
  payment_method: string;
  payment_status: string;
  transaction_id: string | null;
  created_at: string;
  status: string;
}

export interface BuyerComplaint {
  id: number;
  order_id: number;
  subject: string;
  message: string;
  status: string;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
  farmer_name: string | null;
}

export interface AdminOverview {
  total_users: number;
  total_buyers: number;
  total_farmers: number;
  pending_farmers: number;
  total_products: number;
  active_products: number;
  pending_products: number;
  total_orders: number;
  today_orders: number;
  pending_payments: number;
  total_revenue: number;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  user_type: "buyer" | "farmer" | "admin";
  account_status: "Active" | "Blocked";
  approval_status: "Pending" | "Approved" | "Rejected";
  created_at: string;
}

export interface AdminProduct {
  id: number;
  name: string;
  category: string;
  quality: string;
  price: number;
  unit: string;
  available_quantity: number;
  status: "Active" | "Inactive";
  approval_status: "Pending" | "Approved" | "Rejected";
  created_at: string;
  farmer_id: number;
  farmer_name: string;
}

export interface AdminOrder {
  id: number;
  status: string;
  amount: number;
  quantity: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  buyer_name: string;
  farmer_name: string;
  product_name: string;
}

export interface AdminPayment {
  order_id: number;
  amount: number;
  payment_method: string;
  payment_status: string;
  transaction_id: string | null;
  created_at: string;
  buyer_name: string;
}

export interface AdminReportDaily {
  report_date: string;
  orders: number;
  revenue: number;
}

export interface AdminTopProduct {
  name: string;
  order_count: number;
}

export interface FarmerOverview {
  total_products: number;
  active_products: number;
  pending_products: number;
  total_orders: number;
  pending_orders: number;
  total_revenue: number;
  open_complaints: number;
}

export interface FarmerProfile {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  farm_location: string;
}

export interface FarmerOrder {
  id: number;
  status: string;
  quantity: number;
  amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  product_name: string;
  buyer_name: string;
  buyer_phone: string | null;
}

export interface FarmerComplaint {
  id: number;
  order_id: number | null;
  subject: string;
  message: string;
  status: string;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
  buyer_name: string | null;
}

export interface FarmerDocument {
  id: number;
  document_name: string;
  document_url: string;
  verification_status: "Pending" | "Approved" | "Rejected";
  created_at: string;
}

export interface PricePredictionPayload {
  category: "fruit" | "vegetable";
  region: string;
  commodity: string;
  temperature: number;
  rainfall: number;
  humidity: number;
}

export interface WeatherForecastDay {
  date: string;
  avg_temperature: number;
  total_rainfall: number;
  avg_humidity: number;
}

export interface WeatherForecastSummary {
  temperature: number;
  rainfall: number;
  humidity: number;
}

export interface WeatherForecastResult {
  district: string;
  requested_date: string;
  mode: "real_weather" | "historical_climate";
  is_historical_estimate: boolean;
  message: string;
  forecast_window_days: number;
  forecast_days: WeatherForecastDay[];
  summary: WeatherForecastSummary;
  source: string;
  sample_count?: number;
}

export interface PricePredictionResult {
  category: "fruit" | "vegetable";
  region: string;
  commodity: string;
  currency?: string;
  crop_yield_impact_score?: number;
  current_price: number;
  predicted_price: number;
  change_percent: number;
  trend: string;
  best_sell_time: string;
}

export interface OrderConfirmationPayload {
  order_id?: number;
  order_ids?: number[];
  order_reference?: string;
  order_references?: string[];
  payment_method?: "COD" | "ONLINE";
  payment_status?: "PENDING" | "PAID";
  total_amount?: number;
  transaction_id?: string | null;
  message: string;
  success: boolean;
}

/**
 * Product API endpoints
 */
export const productsAPI = {
  /**
   * Get all products for marketplace (buyers)
   */
  async getAllProducts() {
    return api.get<{
      success: boolean;
      products?: ProductMarketplace[];
      message?: string;
    }>("/api/products?all=1");
  },

  /**
   * Get all products for a farmer
   */
  async getProducts(farmerId: number) {
    return api.get<{
      success: boolean;
      products?: Array<{
        id: number;
        name: string;
        category: string;
        quality: string;
        price: number;
        quantity: string;
        unit: string;
        available_quantity: number;
        image_url: string | null;
        description: string | null;
        status: string;
        approval_status?: string;
        created_at: string;
      }>;
      message?: string;
    }>(`/api/products?farmer_id=${farmerId}`);
  },

  /**
   * Get a single product by ID
   */
  async getProduct(productId: number) {
    return api.get<{
      success: boolean;
      product?: ProductDetails;
      message?: string;
    }>(`/api/products/${productId}`);
  },

  /**
   * Create a new product
   */
  async createProduct(data: {
    farmer_id: number;
    name: string;
    category: "Vegetable" | "Fruit";
    quality: "Organic" | "Premium" | "Standard";
    price: number;
    unit: "kg" | "dozen";
    available_quantity: number;
    image_url?: string;
    description?: string;
  }) {
    return api.post<{
      success: boolean;
      message: string;
      product_id?: number;
    }>("/api/products", data);
  },

  /**
   * Update a product
   */
  async updateProduct(productId: number, data: {
    farmer_id: number;
    name?: string;
    category?: "Vegetable" | "Fruit";
    quality?: "Organic" | "Premium" | "Standard";
    price?: number;
    unit?: "kg" | "dozen";
    available_quantity?: number;
    image_url?: string;
    description?: string;
    status?: "Active" | "Inactive";
  }) {
    return api.request<{
      success: boolean;
      message: string;
    }>(`/api/products/${productId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a product
   */
  async deleteProduct(productId: number, farmerId: number) {
    return api.request<{
      success: boolean;
      message: string;
    }>(`/api/products/${productId}`, {
      method: "DELETE",
      body: JSON.stringify({ farmer_id: farmerId }),
    });
  },
};

/**
 * Cart API endpoints (buyers)
 */
export const cartAPI = {
  async getCart(buyerId: number) {
    return api.get<{ success: boolean; items?: CartItem[]; message?: string }>(
      `/api/cart?buyer_id=${buyerId}`
    );
  },
  async getCartCount(buyerId: number) {
    return api.get<{ success: boolean; count?: number }>(
      `/api/cart?buyer_id=${buyerId}&count=1`
    );
  },
  async addToCart(buyerId: number, productId: number, quantity: number) {
    return api.post<{ success: boolean; message: string }>("/api/cart", {
      buyer_id: buyerId,
      product_id: productId,
      quantity,
    });
  },
  async updateCartItem(buyerId: number, productId: number, quantity: number) {
    return api.request<{ success: boolean; message: string }>(
      `/api/cart/${productId}`,
      {
        method: "PUT",
        body: JSON.stringify({ buyer_id: buyerId, quantity }),
      }
    );
  },
  async removeFromCart(buyerId: number, productId: number) {
    return api.request<{ success: boolean; message: string }>(
      `/api/cart/${productId}`,
      {
        method: "DELETE",
        body: JSON.stringify({ buyer_id: buyerId }),
      }
    );
  },
  async checkout(
    buyerId: number,
    paymentMethod: "COD" | "ONLINE" = "COD"
  ) {
    return api.post<OrderConfirmationPayload>(
      "/api/checkout",
      { buyer_id: buyerId, payment_method: paymentMethod }
    );
  },
  async buyNow(
    buyerId: number,
    productId: number,
    quantity: number,
    paymentMethod: "COD" | "ONLINE" = "COD"
  ) {
    return api.post<OrderConfirmationPayload>(
      "/api/buy-now",
      {
        buyer_id: buyerId,
        product_id: productId,
        quantity,
        payment_method: paymentMethod,
      }
    );
  },
};

export const buyerAPI = {
  async getDashboard(buyerId: number) {
    return api.get<{
      success: boolean;
      dashboard?: BuyerDashboardData;
      message?: string;
    }>(`/api/buyer/dashboard?buyer_id=${buyerId}`);
  },
  async getSavedProducts(buyerId: number) {
    return api.get<{
      success: boolean;
      products?: ProductMarketplace[];
      message?: string;
    }>(`/api/saved-products?buyer_id=${buyerId}`);
  },
  async addSavedProduct(buyerId: number, productId: number) {
    return api.post<{ success: boolean; message: string }>("/api/saved-products", {
      buyer_id: buyerId,
      product_id: productId,
    });
  },
  async removeSavedProduct(buyerId: number, productId: number) {
    return api.request<{ success: boolean; message: string }>(
      `/api/saved-products/${productId}`,
      {
        method: "DELETE",
        body: JSON.stringify({ buyer_id: buyerId }),
      }
    );
  },
  async getProfile(buyerId: number) {
    return api.get<{ success: boolean; profile?: BuyerProfile; message?: string }>(
      `/api/buyer/profile?buyer_id=${buyerId}`
    );
  },
  async updateProfile(data: { buyer_id: number; name?: string; phone?: string }) {
    return api.request<{ success: boolean; message: string }>(
      "/api/buyer/profile",
      { method: "PUT", body: JSON.stringify(data) }
    );
  },
  async getOrders(buyerId: number, status?: string) {
    return api.get<{ success: boolean; orders?: BuyerOrder[]; message?: string }>(
      `/api/buyer/orders?buyer_id=${buyerId}${status ? `&status=${encodeURIComponent(status)}` : ""}`
    );
  },
  async getPayments(buyerId: number, paymentStatus?: string) {
    return api.get<{ success: boolean; payments?: BuyerPayment[]; message?: string }>(
      `/api/buyer/payments?buyer_id=${buyerId}${paymentStatus ? `&payment_status=${encodeURIComponent(paymentStatus)}` : ""}`
    );
  },
  async getComplaints(buyerId: number) {
    return api.get<{ success: boolean; complaints?: BuyerComplaint[]; message?: string }>(
      `/api/buyer/complaints?buyer_id=${buyerId}`
    );
  },
  async addComplaint(data: { buyer_id: number; order_id: number; subject: string; message: string }) {
    return api.post<{ success: boolean; message: string; complaint_id?: number }>(
      "/api/buyer/complaints",
      data
    );
  },
};

export const farmerAPI = {
  async getOverview(farmerId: number) {
    return api.get<{ success: boolean; overview?: FarmerOverview; message?: string }>(
      `/api/farmer/overview?farmer_id=${farmerId}`
    );
  },
  async getProfile(farmerId: number) {
    return api.get<{ success: boolean; profile?: FarmerProfile; message?: string }>(
      `/api/farmer/profile?farmer_id=${farmerId}`
    );
  },
  async updateProfile(data: {
    farmer_id: number;
    name?: string;
    phone?: string;
    farm_location?: string;
  }) {
    return api.request<{ success: boolean; message: string }>("/api/farmer/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async getOrders(farmerId: number, status?: string) {
    return api.get<{ success: boolean; orders?: FarmerOrder[]; message?: string }>(
      `/api/farmer/orders?farmer_id=${farmerId}${status ? `&status=${encodeURIComponent(status)}` : ""}`
    );
  },
  async updateOrderStatus(farmerId: number, orderId: number, status: string) {
    return api.request<{ success: boolean; message: string }>(
      `/api/farmer/orders/${orderId}/status`,
      { method: "PUT", body: JSON.stringify({ farmer_id: farmerId, status }) }
    );
  },
  async getReports(farmerId: number, days = 30) {
    return api.get<{
      success: boolean;
      daily_sales?: AdminReportDaily[];
      top_products?: AdminTopProduct[];
      message?: string;
    }>(`/api/farmer/reports?farmer_id=${farmerId}&days=${days}`);
  },
  async getComplaints(farmerId: number, status?: string) {
    return api.get<{ success: boolean; complaints?: FarmerComplaint[]; message?: string }>(
      `/api/farmer/complaints?farmer_id=${farmerId}${status ? `&status=${encodeURIComponent(status)}` : ""}`
    );
  },
  async resolveComplaint(farmerId: number, complaintId: number, resolutionNote: string) {
    return api.request<{ success: boolean; message: string }>(
      `/api/farmer/complaints/${complaintId}/resolve`,
      {
        method: "PUT",
        body: JSON.stringify({ farmer_id: farmerId, resolution_note: resolutionNote }),
      }
    );
  },
  async getDocuments(farmerId: number) {
    return api.get<{ success: boolean; documents?: FarmerDocument[]; message?: string }>(
      `/api/farmer/documents?farmer_id=${farmerId}`
    );
  },
  async uploadDocument(data: {
    farmer_id: number;
    document_name: string;
    document_url: string;
  }) {
    return api.post<{ success: boolean; message: string; document_id?: number }>(
      "/api/farmer/documents",
      data
    );
  },
};

/**
 * Price prediction API endpoints
 */
export const predictionAPI = {
  async getOptions() {
    return api.get<{
      success: boolean;
      message?: string;
      currency?: string;
      regions?: string[];
      fruit_commodities?: string[];
      vegetable_commodities?: string[];
    }>("/api/prediction/options");
  },
  async getWeatherForecast(region: string, date: string) {
    const query = new URLSearchParams({ region, date }).toString();
    return api.get<{
      success: boolean;
      message?: string;
      forecast?: WeatherForecastResult;
    }>(`/api/weather/forecast?${query}`);
  },
  async predictPrice(data: PricePredictionPayload) {
    return api.post<{
      success: boolean;
      message?: string;
      prediction?: PricePredictionResult;
    }>("/api/predict-price", data);
  },
};

const buildQuery = (params?: Record<string, string | undefined>) => {
  if (!params) return "";
  const cleaned = Object.entries(params).filter(([, v]) => v != null && v !== "");
  const query = new URLSearchParams(cleaned as [string, string][]).toString();
  return query ? `?${query}` : "";
};

export const adminAPI = {
  async getOverview() {
    return api.get<{ success: boolean; overview?: AdminOverview; message?: string }>(
      "/api/admin/overview"
    );
  },
  async getUsers(params?: { user_type?: string; account_status?: string; q?: string }) {
    return api.get<{ success: boolean; users?: AdminUser[]; message?: string }>(
      `/api/admin/users${buildQuery(params)}`
    );
  },
  async updateUserStatus(userId: number, status: "Active" | "Blocked") {
    return api.request<{ success: boolean; message: string }>(
      `/api/admin/users/${userId}/status`,
      { method: "PUT", body: JSON.stringify({ status }) }
    );
  },
  async getFarmers(params?: { approval_status?: string }) {
    return api.get<{ success: boolean; farmers?: AdminUser[]; message?: string }>(
      `/api/admin/farmers${buildQuery(params)}`
    );
  },
  async updateFarmerApproval(
    userId: number,
    approvalStatus: "Pending" | "Approved" | "Rejected"
  ) {
    return api.request<{ success: boolean; message: string }>(
      `/api/admin/farmers/${userId}/approval`,
      { method: "PUT", body: JSON.stringify({ approval_status: approvalStatus }) }
    );
  },
  async getProducts(params?: { approval_status?: string; status?: string }) {
    return api.get<{ success: boolean; products?: AdminProduct[]; message?: string }>(
      `/api/admin/products${buildQuery(params)}`
    );
  },
  async updateProductApproval(
    productId: number,
    approvalStatus: "Pending" | "Approved" | "Rejected"
  ) {
    return api.request<{ success: boolean; message: string }>(
      `/api/admin/products/${productId}/approval`,
      { method: "PUT", body: JSON.stringify({ approval_status: approvalStatus }) }
    );
  },
  async getOrders(params?: { status?: string; limit?: string }) {
    return api.get<{ success: boolean; orders?: AdminOrder[]; message?: string }>(
      `/api/admin/orders${buildQuery(params)}`
    );
  },
  async getPayments(params?: { payment_status?: string; method?: string; limit?: string }) {
    return api.get<{ success: boolean; payments?: AdminPayment[]; message?: string }>(
      `/api/admin/payments${buildQuery(params)}`
    );
  },
  async getReports() {
    return api.get<{
      success: boolean;
      daily_sales?: AdminReportDaily[];
      top_products?: AdminTopProduct[];
      message?: string;
    }>("/api/admin/reports");
  },
};
