import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import { Leaf } from "lucide-react";
import { toast } from "sonner";
import { authAPI } from "@/lib/api";

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i;
const PHONE_REGEX = /^\+?\d{10,15}$/;

type PendingRegistration = {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  user_type: "farmer" | "buyer";
  verification_type: "email" | "phone";
  identifier: string;
};

const Register = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<"farmer" | "buyer">("buyer");
  const [contactMethod, setContactMethod] = useState<"email" | "phone">("email");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.password || !formData.confirmPassword) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    const cleanedEmail = formData.email.trim();
    const cleanedPhone = formData.phone.replace(/[\s()-]/g, "");

    if (contactMethod === "email") {
      if (!cleanedEmail) {
        toast.error("Enter email address");
        return;
      }
      if (!EMAIL_REGEX.test(cleanedEmail)) {
        toast.error("Please enter a valid email address");
        return;
      }
    } else {
      if (!cleanedPhone) {
        toast.error("Enter phone number");
        return;
      }
      if (!PHONE_REGEX.test(cleanedPhone)) {
        toast.error("Please enter a valid phone number (10-15 digits)");
        return;
      }
    }

    setLoading(true);

    try {
      const verificationType = contactMethod;
      const identifier = verificationType === "email" ? cleanedEmail : cleanedPhone;

      const otpResponse = await authAPI.sendOtp({
        identifier_type: verificationType,
        identifier,
      });

      if (!otpResponse.success) {
        throw new Error(otpResponse.message || "Failed to send OTP");
      }

      const pendingRegistration: PendingRegistration = {
        name: formData.name.trim(),
        email: contactMethod === "email" ? cleanedEmail : undefined,
        phone: contactMethod === "phone" ? cleanedPhone : undefined,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        user_type: userType,
        verification_type: verificationType,
        identifier,
      };

      sessionStorage.setItem("pendingRegistration", JSON.stringify(pendingRegistration));
      toast.success("OTP sent. Verify OTP to complete registration.");
      navigate("/register-verify", { state: pendingRegistration });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
              <Leaf className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Create Account</h1>
            <p className="text-muted-foreground">Register as Buyer or Farmer using Email or Phone</p>
          </div>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Register</CardTitle>
              <CardDescription>Fill details and click Create Account to receive OTP</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={userType} onValueChange={(v) => setUserType(v as typeof userType)}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="buyer">Buyer</TabsTrigger>
                  <TabsTrigger value="farmer">Farmer</TabsTrigger>
                </TabsList>

                <TabsContent value={userType}>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Register Method</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={contactMethod === "email" ? "default" : "outline"}
                          onClick={() => setContactMethod("email")}
                        >
                          Email
                        </Button>
                        <Button
                          type="button"
                          variant={contactMethod === "phone" ? "default" : "outline"}
                          onClick={() => setContactMethod("phone")}
                        >
                          Phone
                        </Button>
                      </div>
                    </div>

                    {contactMethod === "email" ? (
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="+94771234567"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="********"
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="********"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Sending OTP..." : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;
