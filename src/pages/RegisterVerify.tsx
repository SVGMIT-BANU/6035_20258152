import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { authAPI } from "@/lib/api";

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

const RegisterVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const pending = useMemo(() => {
    const fromState = location.state as PendingRegistration | null;
    if (fromState) {
      return fromState;
    }

    const raw = sessionStorage.getItem("pendingRegistration");
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as PendingRegistration;
    } catch {
      return null;
    }
  }, [location.state]);

  useEffect(() => {
    if (!pending) {
      toast.error("Registration details not found. Please register again.");
      navigate("/register");
      return;
    }
  }, [navigate, pending]);

  const handleResendOtp = async () => {
    if (!pending) return;
    setResending(true);
    try {
      const data = await authAPI.sendOtp({
        identifier_type: pending.verification_type,
        identifier: pending.identifier,
      });

      if (!data.success) {
        throw new Error(data.message || "Failed to resend OTP");
      }

      toast.success("OTP resent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending) return;

    if (!otp.trim()) {
      toast.error("Enter OTP code");
      return;
    }

    setLoading(true);
    try {
      const verifyResponse = await authAPI.verifyOtp({
        identifier_type: pending.verification_type,
        identifier: pending.identifier,
        otp: otp.trim(),
      });

      if (!verifyResponse.success || !verifyResponse.verification_token) {
        throw new Error(verifyResponse.message || "OTP verification failed");
      }

      const registerResponse = await authAPI.register({
        name: pending.name,
        email: pending.email,
        phone: pending.phone,
        password: pending.password,
        confirmPassword: pending.confirmPassword,
        user_type: pending.user_type,
        verification_type: pending.verification_type,
        verification_token: verifyResponse.verification_token,
      });

      if (!registerResponse.success) {
        throw new Error(registerResponse.message || "Registration failed");
      }

      sessionStorage.removeItem("pendingRegistration");
      toast.success("Account created successfully");
      navigate("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  if (!pending) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Verify OTP</CardTitle>
              <CardDescription>
                OTP sent to {pending.verification_type === "email" ? pending.email : pending.phone}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP Code</Label>
                  <Input
                    id="otp"
                    name="otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verifying..." : "Verify OTP"}
                </Button>

                <Button type="button" variant="outline" className="w-full" onClick={handleResendOtp} disabled={resending}>
                  {resending ? "Resending..." : "Resend OTP"}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <Link to="/register" className="text-primary hover:underline font-medium">
                  Back to Register
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RegisterVerify;
