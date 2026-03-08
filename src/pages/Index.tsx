import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Leaf, TrendingUp, ShoppingBag, Users, Brain, BarChart3, MapPin, Sprout } from "lucide-react";
import heroImage from "@/assets/hero-market.jpg";
import fruitsImage from "@/assets/fruits.jpg";
import vegetablesImage from "@/assets/vegetables.jpg";
import sriLankaMapImage from "@/assets/R.jpeg";
import { useLanguage } from "@/components/LanguageProvider";

const Index = () => {
  const { t } = useLanguage();
  const features = [
    {
      icon: <ShoppingBag className="h-8 w-8" />,
      title: "Direct Market Access",
      description: "Sell direct to homes, hotels, and shops with fair farmgate pricing.",
    },
    {
      icon: <Brain className="h-8 w-8" />,
      title: "AI Price Prediction",
      description: "District-aware predictions in LKR help farmers pick the right selling window.",
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Yield & Sales Insights",
      description: "Track harvest volume, demand, and price trends to reduce post-harvest loss.",
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Farmer-First Platform",
      description: "Simple mobile-friendly flows made for Sri Lankan farmers and local buyers.",
    },
  ];

  const stats = [
    { number: "25+", label: "District Coverage" },
    { number: "6,500+", label: "Farmer Members" },
    { number: "18K+", label: "Orders Delivered" },
    { number: "LKR 220M+", label: "Trade Value" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="relative overflow-hidden py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(42_95%_74%_/_0.2),transparent_26%)]" />
        <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-[radial-gradient(circle_at_center,hsl(147_58%_36%_/_0.16),transparent_60%)] lg:block" />
        <div className="container relative mx-auto px-4">
          <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-6 fade-in-up">
              <div className="section-kicker">
                <Leaf className="h-4 w-4 text-primary" />
                <span>{t("home.badge")}</span>
              </div>
              <h1 className="max-w-4xl text-5xl font-bold leading-tight lg:text-7xl">
                {t("home.title1")}
                <span className="block bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
                  {t("home.title2")}
                </span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
                {t("home.subtitle")}
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-sm shadow-card">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Colombo to Monaragala
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-sm shadow-card">
                  <Sprout className="h-3.5 w-3.5 text-primary" /> {t("home.farmerFriendly")}
                </span>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" variant="hero">
                  <Link to="/register">{t("home.farmerStart")}</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/marketplace">{t("home.explore")}</Link>
                </Button>
              </div>
            </div>
            <div className="relative fade-in-up">
              <div className="absolute -left-6 top-10 hidden rounded-[2rem] border border-border bg-card/92 p-5 shadow-soft lg:block">
                <p className="text-sm text-muted-foreground">Farmgate Price Confidence</p>
                <p className="mt-2 text-3xl font-bold text-primary">+24%</p>
                <p className="mt-1 text-sm text-muted-foreground">Better timing with district-level guidance</p>
              </div>
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-primary/20 to-secondary/20 blur-3xl" />
              <img
                src={heroImage}
                alt="Sri Lanka vegetable and fruit market"
                className="relative w-full rounded-[2rem] border border-white/50 shadow-soft"
              />
              <div className="absolute -bottom-6 right-4 rounded-[1.75rem] bg-card/94 p-5 shadow-soft backdrop-blur md:right-8">
                <p className="text-sm text-muted-foreground">Connected value chain</p>
                <div className="mt-3 flex items-center gap-3 text-sm font-medium">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">Farmer</span>
                  <span className="text-muted-foreground">to</span>
                  <span className="rounded-full bg-secondary/10 px-3 py-1 text-secondary">Buyer</span>
                  <span className="text-muted-foreground">to</span>
                  <span className="rounded-full bg-accent/18 px-3 py-1 text-foreground">Market</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="soil-panel rounded-[1.5rem] p-6 text-center">
                <div className="mb-2 text-4xl font-bold text-primary">{stat.number}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <span className="section-kicker">Market Lanes</span>
              <h2 className="mt-3 text-3xl font-bold text-foreground">Built around real Sri Lankan produce flows</h2>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="overflow-hidden border-0 soil-panel">
              <img src={vegetablesImage} alt="Fresh Sri Lankan vegetables" className="h-52 w-full object-cover" />
              <CardContent className="p-6">
                <h3 className="text-2xl font-semibold mb-2">{t("home.vegetableLane")}</h3>
                <p className="text-muted-foreground">
                  {t("home.vegetableDesc")}
                </p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 soil-panel">
              <img src={fruitsImage} alt="Fresh Sri Lankan fruits" className="h-52 w-full object-cover" />
              <CardContent className="p-6">
                <h3 className="text-2xl font-semibold mb-2">{t("home.fruitLane")}</h3>
                <p className="text-muted-foreground">
                  {t("home.fruitDesc")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-6 overflow-hidden rounded-[2rem] soil-panel p-4 md:grid-cols-[1.08fr_0.92fr] md:p-6">
            <div className="overflow-hidden rounded-[1.5rem]">
              <img
                src={sriLankaMapImage}
                alt="Sri Lanka agriculture map"
                className="h-[320px] w-full object-cover"
              />
            </div>
            <div className="space-y-4 px-2">
              <span className="section-kicker">Sri Lanka Focus</span>
              <h2 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
                Designed for Sri Lankan farmers, crops, and district markets
              </h2>
              <p className="text-base leading-7 text-muted-foreground md:text-lg">
                From hill country vegetables to coastal fruit markets, this platform is shaped around local trade,
                local climate, and local farmer decisions.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">25 District Ready</span>
                <span className="rounded-full bg-secondary/10 px-4 py-2 text-sm font-medium text-secondary">Tamil / Sinhala / English</span>
                <span className="rounded-full bg-accent/20 px-4 py-2 text-sm font-medium text-foreground">Farmer-first workflow</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="section-kicker">Why It Works</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("home.featuresTitle")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("home.featuresSubtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="soil-panel rounded-[1.5rem] border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
                <CardContent className="p-6 text-center">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="section-kicker">Simple Flow</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("home.howTitle")}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t("home.howSubtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "01", title: "Register", desc: "Create your account and select farmer or buyer role" },
              { step: "02", title: "Predict + List", desc: "Use AI price forecast, then publish products confidently" },
              { step: "03", title: "Trade Smart", desc: "Sell faster and make better decisions using live insights" },
            ].map((item, index) => (
              <div key={index} className="soil-panel rounded-[1.5rem] p-6 text-center">
                <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="relative overflow-hidden border-0 text-primary-foreground shadow-soft">
            <div className="absolute inset-0 sri-gradient" />
            <CardContent className="relative p-12 text-center">
              <TrendingUp className="h-16 w-16 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t("home.ctaTitle")}
              </h2>
              <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                {t("home.ctaSubtitle")}
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button asChild size="lg" variant="secondary">
                  <Link to="/register">{t("home.startSelling")}</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                  <Link to="/marketplace">{t("home.startBuying")}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2026 GoviLink Market AI. {t("home.footer")}</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
