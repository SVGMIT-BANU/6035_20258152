import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Tractor } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

const FarmerLayout = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const menuItems = [
    { to: "/farmer-dashboard", label: t("menu.overview") },
    { to: "/farmer-dashboard/profile", label: t("menu.profile") },
    { to: "/farmer-dashboard/products", label: t("menu.products") },
    { to: "/farmer-dashboard/orders", label: t("menu.orders") },
    { to: "/farmer-dashboard/reports", label: t("menu.reports") },
    { to: "/farmer-dashboard/complaints", label: t("menu.complaints") },
    { to: "/price-prediction", label: t("menu.aiPrediction") },
  ];

  useEffect(() => {
    if (!user?.id || user?.user_type !== "farmer") {
      navigate("/login");
    }
  }, [navigate, user?.id, user?.user_type]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="relative overflow-hidden py-10 text-primary-foreground">
        <div className="absolute inset-0 sri-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(44_95%_72%_/_0.22),transparent_28%)]" />
        <div className="container mx-auto px-4">
          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-white/12 p-3 backdrop-blur">
              <Tractor className="h-8 w-8" />
            </div>
            <div>
              <span className="section-kicker border-white/20 bg-white/10 text-white">Farmer Workspace</span>
              <h1 className="text-3xl font-bold">{t("layout.farmer.title")}</h1>
              <p className="mt-2 max-w-2xl text-white/86">{t("layout.farmer.subtitle")}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="py-8">
        <div className="container mx-auto grid grid-cols-1 gap-6 px-4 lg:grid-cols-[280px_1fr]">
          <aside className="dashboard-sidebar h-fit rounded-[1.5rem] p-5">
            <p className="text-sm text-muted-foreground mb-3">{t("layout.menu")}</p>
            <div className="space-y-1">
              {menuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/farmer-dashboard"}
                  className={({ isActive }) =>
                    `block rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                      isActive ? "bg-primary text-primary-foreground shadow-soft" : "hover:bg-accent"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </aside>
          <main className="dashboard-shell rounded-[1.8rem] p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </section>
    </div>
  );
};

export default FarmerLayout;
