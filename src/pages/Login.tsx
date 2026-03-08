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
import { useLanguage } from "@/components/LanguageProvider";

const Login = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"farmer" | "buyer" | "admin">("buyer");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          user_type: userType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("authToken", "authenticated");

        toast.success(data.message);

        switch (data.user.user_type) {
          case "farmer":
            navigate("/farmer-dashboard");
            break;
          case "buyer":
            navigate("/buyer-dashboard");
            break;
          case "admin":
            navigate("/admin-dashboard");
            break;
          default:
            navigate("/buyer-dashboard");
        }
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to connect to server. Please try again.");
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
            <h1 className="text-3xl font-bold mb-2">{t("login.welcome")}</h1>
            <p className="text-muted-foreground">{t("login.subtitle")}</p>
          </div>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>{t("login.title")}</CardTitle>
              <CardDescription>{t("login.desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={userType} onValueChange={(v) => setUserType(v as typeof userType)}>
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="buyer">{t("login.buyer")}</TabsTrigger>
                  <TabsTrigger value="farmer">{t("login.farmer")}</TabsTrigger>
                  <TabsTrigger value="admin">{t("login.admin")}</TabsTrigger>
                </TabsList>
                <TabsContent value={userType}>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("login.email")}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">{t("login.password")}</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="********"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? t("login.signingIn") : `${t("login.signInAs")} ${t(`login.${userType}`)}`}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">{t("login.noAccount")} </span>
                <Link to="/register" className="text-primary hover:underline font-medium">
                  {t("login.registerHere")}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
