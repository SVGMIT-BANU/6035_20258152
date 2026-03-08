import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Leaf, Menu, X, ShoppingCart } from "lucide-react";
import { useState, useEffect } from "react";
import { cartAPI } from "@/lib/api";
import { useLanguage, type AppLanguage } from "@/components/LanguageProvider";

type UserType = "buyer" | "farmer" | "admin";

const getDashboardPath = (userType?: string): string | null => {
  switch (userType as UserType) {
    case "farmer":
      return "/farmer-dashboard";
    case "buyer":
      return "/buyer-dashboard";
    case "admin":
      return "/admin-dashboard";
    default:
      return null;
  }
};

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const { language, setLanguage, t } = useLanguage();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isLoggedIn = Boolean(user?.id && user?.user_type);
  const isBuyer = user?.user_type === "buyer";
  const canSeePrediction = user?.user_type === "farmer" || user?.user_type === "admin";
  const dashboardPath = getDashboardPath(user?.user_type);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    setCartCount(0);
    setMobileMenuOpen(false);
    navigate("/login");
  };

  const refreshCartCount = () => {
    if (isBuyer && user?.id) {
      cartAPI.getCartCount(user.id).then((r) => {
        if (r.success && r.count != null) setCartCount(r.count);
      });
    } else setCartCount(0);
  };

  useEffect(() => {
    refreshCartCount();
  }, [isBuyer, user?.id, location.pathname]);

  useEffect(() => {
    const onCartUpdate = () => refreshCartCount();
    window.addEventListener("cart-updated", onCartUpdate);
    return () => window.removeEventListener("cart-updated", onCartUpdate);
  }, [isBuyer, user?.id]);

  const navLinks = [
    { to: "/", label: t("nav.home") },
    { to: "/marketplace", label: t("nav.marketplace") },
    ...(canSeePrediction ? [{ to: "/price-prediction", label: t("nav.prediction") }] : []),
    ...(dashboardPath ? [{ to: dashboardPath, label: t("nav.dashboard") }] : []),
    ...(!isLoggedIn ? [{ to: "/login", label: t("nav.login") }] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border/70 bg-background/88 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex min-h-[78px] items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="rounded-[1.35rem] bg-primary p-3 shadow-soft transition-transform group-hover:scale-105">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">Sri Lanka Agri Trade</p>
              <span className="text-2xl font-extrabold tracking-tight text-foreground">GoviLink</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-3">
            <label className="flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-2 text-sm text-muted-foreground">
              <span>{t("language.label")}</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                className="rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground"
              >
                <option value="en">{t("language.en")}</option>
                <option value="ta">{t("language.ta")}</option>
                <option value="si">{t("language.si")}</option>
              </select>
            </label>
            <div className="flex items-center rounded-full border border-border/70 bg-card/70 p-1 shadow-card">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    location.pathname === link.to
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            {isBuyer && (
              <Button asChild variant="outline" size="sm">
                <Link to="/cart" className="flex items-center gap-1">
                  <ShoppingCart className="h-4 w-4" />
                  {t("nav.cart")} {cartCount > 0 && `(${cartCount})`}
                </Link>
              </Button>
            )}
            {!isLoggedIn && (
              <Button asChild size="sm">
                <Link to="/register">{t("nav.getStarted")}</Link>
              </Button>
            )}
            {isLoggedIn && (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                {t("nav.logout")}
              </Button>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl border border-border bg-card p-2 transition-colors hover:bg-accent md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-border py-4 md:hidden">
            <div className="px-4 pb-3">
              <label className="block text-sm text-muted-foreground mb-1">{t("language.label")}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="en">{t("language.en")}</option>
                <option value="ta">{t("language.ta")}</option>
                <option value="si">{t("language.si")}</option>
              </select>
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-xl px-4 py-3 transition-colors ${
                  location.pathname === link.to
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="px-4 pt-2 space-y-2">
              {isBuyer && (
                <Button asChild variant="outline" className="w-full">
                  <Link to="/cart" onClick={() => setMobileMenuOpen(false)}>
                    {t("nav.cart")} {cartCount > 0 ? `(${cartCount})` : ""}
                  </Link>
                </Button>
              )}
              {!isLoggedIn && (
                <Button asChild className="w-full">
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    {t("nav.getStarted")}
                  </Link>
                </Button>
              )}
              {isLoggedIn && (
                <Button variant="outline" className="w-full" onClick={handleLogout}>
                  {t("nav.logout")}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
