import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Brain, TrendingUp, Calendar, CloudRain, Thermometer, Droplets } from "lucide-react";
import { toast } from "sonner";
import {
  predictionAPI,
  type PricePredictionPayload,
  type PricePredictionResult,
  type WeatherForecastResult,
} from "@/lib/api";
import marketHero from "@/assets/hero-market.jpg";
import { useLanguage } from "@/components/LanguageProvider";

type PredictionCategory = "fruit" | "vegetable";
type PredictionFormState = {
  category: PredictionCategory | "";
  commodity: string;
  region: string;
  targetDate: string;
  temperature: number | "";
  rainfall: number | "";
  humidity: number | "";
};

const todayIso = new Date().toISOString().slice(0, 10);

const PricePrediction = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);
  const [fruitCommodities, setFruitCommodities] = useState<string[]>([]);
  const [vegetableCommodities, setVegetableCommodities] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<PricePredictionResult | null>(null);
  const [forecast, setForecast] = useState<WeatherForecastResult | null>(null);

  const [formData, setFormData] = useState<PredictionFormState>({
    category: "",
    commodity: "",
    region: "",
    targetDate: todayIso,
    temperature: "",
    rainfall: "",
    humidity: "",
  });

  const commodityOptions = useMemo(
    () => (formData.category === "fruit" ? fruitCommodities : vegetableCommodities),
    [formData.category, fruitCommodities, vegetableCommodities]
  );

  const categoryLabels = {
    en: { vegetable: "Vegetable", fruit: "Fruit" },
    ta: {
      vegetable: "\u0b95\u0bbe\u0baf\u0bcd\u0b95\u0bb1\u0bbf",
      fruit: "\u0baa\u0bb4\u0bae\u0bcd",
    },
    si: {
      vegetable: "\u0d91\u0dc5\u0dc0\u0dc5\u0dd4",
      fruit: "\u0db4\u0dbd\u0dad\u0dd4\u0dbb\u0dd4",
    },
  }[language];

  const helperCopy = {
    en: {
      authError: "AI prediction is available only for farmers and admins.",
      districtRequired: "District and date are required",
      weatherLoaded: "Weather data loaded",
      weatherError: "Unable to fetch weather forecast",
      fillAll: "Please complete all fields",
      predictionReady: "Price prediction ready",
      predictionError: "Prediction failed",
      loadOptionsError: "Failed to load model options",
    },
    ta: {
      authError: "AI \u0bb5\u0bbf\u0bb2\u0bc8 \u0b95\u0ba3\u0bbf\u0baa\u0bcd\u0baa\u0bc1 \u0bb5\u0bbf\u0bb5\u0b9a\u0bbe\u0baf\u0bbf \u0bae\u0bb1\u0bcd\u0bb1\u0bc1\u0bae\u0bcd \u0ba8\u0bbf\u0bb0\u0bcd\u0bb5\u0bbe\u0b95\u0bbf\u0b95\u0bb3\u0bc1\u0b95\u0bcd\u0b95\u0bc1 \u0bae\u0b9f\u0bcd\u0b9f\u0bc1\u0bae\u0bcd.",
      districtRequired: "\u0bae\u0bbe\u0bb5\u0b9f\u0bcd\u0b9f\u0bae\u0bcd \u0bae\u0bb1\u0bcd\u0bb1\u0bc1\u0bae\u0bcd \u0ba4\u0bc7\u0ba4\u0bbf \u0ba4\u0bc7\u0bb5\u0bc8.",
      weatherLoaded: "\u0bb5\u0bbe\u0ba9\u0bbf\u0bb2\u0bc8 \u0ba4\u0bb0\u0bb5\u0bc1 \u0b8f\u0bb1\u0bcd\u0bb1\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1.",
      weatherError: "\u0bb5\u0bbe\u0ba9\u0bbf\u0bb2\u0bc8 \u0ba4\u0bb0\u0bb5\u0bc8 \u0baa\u0bc6\u0bb1 \u0bae\u0bc1\u0b9f\u0bbf\u0baf\u0bb5\u0bbf\u0bb2\u0bcd\u0bb2\u0bc8.",
      fillAll: "\u0b85\u0ba9\u0bc8\u0ba4\u0bcd\u0ba4\u0bc1 \u0baa\u0bc1\u0bb2\u0b99\u0bcd\u0b95\u0bb3\u0bc8\u0baf\u0bc1\u0bae\u0bcd \u0ba8\u0bbf\u0bb0\u0baa\u0bcd\u0baa\u0bb5\u0bc1\u0bae\u0bcd.",
      predictionReady: "\u0bb5\u0bbf\u0bb2\u0bc8 \u0b95\u0ba3\u0bbf\u0baa\u0bcd\u0baa\u0bc1 \u0ba4\u0baf\u0bbe\u0bb0\u0bbe\u0b95\u0bbf\u0bb5\u0bbf\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1.",
      predictionError: "\u0bb5\u0bbf\u0bb2\u0bc8 \u0b95\u0ba3\u0bbf\u0baa\u0bcd\u0baa\u0bc1 \u0ba4\u0bcb\u0bb2\u0bcd\u0bb5\u0bbf\u0baf\u0b9f\u0bc8\u0ba8\u0bcd\u0ba4\u0ba4\u0bc1.",
      loadOptionsError: "\u0ba4\u0bc7\u0bb0\u0bcd\u0bb5\u0bc1 \u0ba4\u0bb0\u0bb5\u0bc1\u0b95\u0bb3\u0bc8 \u0b8f\u0bb1\u0bcd\u0bb1 \u0bae\u0bc1\u0b9f\u0bbf\u0baf\u0bb5\u0bbf\u0bb2\u0bcd\u0bb2\u0bc8.",
    },
    si: {
      authError: "AI \u0db8\u0dd2\u0dbd \u0d85\u0db1\u0dcf\u0dc0\u0dd0\u0d9a\u0dd2\u0dba \u0d9c\u0ddc\u0dc0\u0dd2\u0db1\u0dca \u0dc3\u0dc4 \u0db4\u0dbb\u0dd2\u0db4\u0dcf\u0dbd\u0d9a\u0dba\u0db1\u0dca\u0da7 \u0db4\u0db8\u0dab\u0dd2.",
      districtRequired: "\u0daf\u0dd2\u0dc3\u0dca\u0dad\u0dca\u200d\u0dbb\u0dd2\u0d9a\u0dca\u0d9a\u0dba \u0dc3\u0dc4 \u0daf\u0dd2\u0db1\u0dba \u0d85\u0dc0\u0dc1\u0dca\u0dba\u0dba\u0dd2.",
      weatherLoaded: "\u0d9a\u0dcf\u0dbd\u0d9c\u0dd4\u0dab \u0daf\u0dad\u0dca\u0dad \u0dbd\u0db6\u0dcf\u0d9c\u0dad\u0dca\u0dad\u0dcf.",
      weatherError: "\u0d9a\u0dcf\u0dbd\u0d9c\u0dd4\u0dab \u0daf\u0dad\u0dca\u0dad \u0dbd\u0db6\u0dcf\u0d9c\u0dd0\u0db1\u0dd3\u0db8\u0da7 \u0db1\u0ddc\u0dc4\u0dd0\u0d9a\u0dd2\u0dba.",
      fillAll: "\u0dc3\u0dd2\u0dba\u0dbd\u0dd4 \u0d9a\u0dca\u0dc2\u0dda\u0dad\u0dca\u200d\u0dbb \u0dc3\u0db8\u0dca\u0db4\u0dd6\u0dbb\u0dca\u0dab \u0d9a\u0dbb\u0db1\u0dca\u0db1.",
      predictionReady: "\u0db8\u0dd2\u0dbd \u0d85\u0db1\u0dcf\u0dc0\u0dd0\u0d9a\u0dd2\u0dba \u0dc3\u0dd6\u0daf\u0dcf\u0db1\u0db8\u0dca.",
      predictionError: "\u0db8\u0dd2\u0dbd \u0d85\u0db1\u0dcf\u0dc0\u0dd0\u0d9a\u0dd2\u0dba \u0d85\u0dc3\u0db8\u0dad\u0dca \u0dc0\u0dd2\u0dba.",
      loadOptionsError: "\u0dad\u0ddd\u0dbb\u0dcf\u0d9c\u0dd0\u0db1\u0dd3\u0db8\u0dca \u0daf\u0dad\u0dca\u0dad \u0dbd\u0db6\u0dcf\u0d9c\u0dd0\u0db1\u0dd3\u0db8\u0da7 \u0db1\u0ddc\u0dc4\u0dd0\u0d9a\u0dd2\u0dba.",
    },
  }[language];

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?.id || (user?.user_type !== "farmer" && user?.user_type !== "admin")) {
      toast.error(helperCopy.authError);
      navigate("/login");
      return;
    }
  }, [helperCopy.authError, navigate]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoadingOptions(true);
        const res = await predictionAPI.getOptions();
        if (!res.success) {
          throw new Error(res.message || "Unable to load prediction options");
        }
        setRegions(res.regions || []);
        setFruitCommodities(res.fruit_commodities || []);
        setVegetableCommodities(res.vegetable_commodities || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : helperCopy.loadOptionsError);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, [helperCopy.loadOptionsError]);

  const resetForm = () => {
    setFormData({
      category: "",
      commodity: "",
      region: "",
      targetDate: todayIso,
      temperature: "",
      rainfall: "",
      humidity: "",
    });
    setPrediction(null);
    setForecast(null);
  };

  const onCategoryChange = (value: PredictionCategory) => {
    const nextCommodityList = value === "fruit" ? fruitCommodities : vegetableCommodities;
    setFormData((prev) => ({
      ...prev,
      category: value,
      commodity: nextCommodityList[0] || "",
    }));
  };

  const fetchWeather = async () => {
    if (!formData.region || !formData.targetDate) {
      toast.error(helperCopy.districtRequired);
      return;
    }

    try {
      setLoadingWeather(true);
      const res = await predictionAPI.getWeatherForecast(formData.region, formData.targetDate);
      if (!res.success || !res.forecast) {
        throw new Error(res.message || "Unable to fetch weather forecast");
      }
      setForecast(res.forecast);
      setFormData((prev) => ({
        ...prev,
        temperature: res.forecast.summary.temperature,
        rainfall: res.forecast.summary.rainfall,
        humidity: res.forecast.summary.humidity,
      }));
      toast.success(helperCopy.weatherLoaded);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : helperCopy.weatherError);
    } finally {
      setLoadingWeather(false);
    }
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.category ||
      !formData.commodity ||
      !formData.region ||
      !formData.targetDate ||
      formData.temperature === "" ||
      formData.rainfall === "" ||
      formData.humidity === ""
    ) {
      toast.error(helperCopy.fillAll);
      return;
    }

    setPredicting(true);
    try {
      const payload: PricePredictionPayload = {
        category: formData.category,
        commodity: formData.commodity,
        region: formData.region,
        temperature: Number(formData.temperature),
        rainfall: Number(formData.rainfall),
        humidity: Number(formData.humidity),
      };
      const res = await predictionAPI.predictPrice(payload);
      if (!res.success || !res.prediction) {
        throw new Error(res.message || helperCopy.predictionError);
      }
      setPrediction(res.prediction);
      toast.success(helperCopy.predictionReady);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : helperCopy.predictionError);
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden py-16 text-primary-foreground">
        <img src={marketHero} alt="Sri Lanka market analytics" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/75 to-secondary/80" />
        <div className="container mx-auto px-4 text-center relative">
          <Brain className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t("price.heroTitle")}</h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto">{t("price.heroSubtitle")}</p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>{t("price.formTitle")}</CardTitle>
                <CardDescription>{t("price.formDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePredict} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="category">{t("price.category")}</Label>
                    <Select value={formData.category} onValueChange={(value) => onCategoryChange(value as PredictionCategory)} required>
                      <SelectTrigger id="category" className="h-12 text-base">
                        <SelectValue placeholder={t("price.category")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vegetable">{categoryLabels.vegetable}</SelectItem>
                        <SelectItem value="fruit">{categoryLabels.fruit}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commodity">{t("price.crop")}</Label>
                    <Select
                      value={formData.commodity}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, commodity: value }))}
                      disabled={loadingOptions}
                      required
                    >
                      <SelectTrigger id="commodity" className="h-12 text-base">
                        <SelectValue placeholder={t("price.crop")} />
                      </SelectTrigger>
                      <SelectContent>
                        {commodityOptions.map((commodity) => (
                          <SelectItem key={commodity} value={commodity}>
                            {commodity}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="region">{t("price.district")}</Label>
                    <Select
                      value={formData.region}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, region: value }))}
                      disabled={loadingOptions}
                      required
                    >
                      <SelectTrigger id="region" className="h-12 text-base">
                        <SelectValue placeholder={t("price.district")} />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetDate">{t("price.date")}</Label>
                    <Input
                      id="targetDate"
                      type="date"
                      className="h-12 text-base"
                      value={formData.targetDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, targetDate: e.target.value }))}
                      required
                    />
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full h-14 text-base"
                    onClick={fetchWeather}
                    disabled={loadingOptions || loadingWeather || !formData.region || !formData.targetDate}
                  >
                    {loadingWeather ? t("price.loadingWeather") : t("price.getWeather")}
                  </Button>

                  <div className="space-y-2">
                    <Label htmlFor="temperature">{t("price.temperature")}</Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      className="h-12 text-base"
                      value={formData.temperature}
                      onChange={(e) => setFormData((prev) => ({ ...prev, temperature: e.target.value === "" ? "" : Number(e.target.value) }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rainfall">{t("price.rainfall")}</Label>
                    <Input
                      id="rainfall"
                      type="number"
                      step="0.1"
                      className="h-12 text-base"
                      value={formData.rainfall}
                      onChange={(e) => setFormData((prev) => ({ ...prev, rainfall: e.target.value === "" ? "" : Number(e.target.value) }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="humidity">{t("price.humidity")}</Label>
                    <Input
                      id="humidity"
                      type="number"
                      step="0.1"
                      className="h-12 text-base"
                      value={formData.humidity}
                      onChange={(e) => setFormData((prev) => ({ ...prev, humidity: e.target.value === "" ? "" : Number(e.target.value) }))}
                      required
                    />
                  </div>

                  {forecast && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                      <div>
                        <p className="font-semibold text-base">{t("price.weatherSummary")}</p>
                        <p className="text-sm text-muted-foreground">
                          {forecast.district} | {forecast.requested_date} | {forecast.source}
                        </p>
                        <p className={`text-sm mt-1 ${forecast.is_historical_estimate ? "text-amber-700" : "text-emerald-700"}`}>
                          {forecast.message}
                        </p>
                      </div>
                      <div className="grid gap-2 text-sm">
                        {forecast.forecast_days.map((day) => (
                          <div key={day.date} className="grid grid-cols-4 gap-2 rounded-md bg-background p-2">
                            <span>{day.date}</span>
                            <span>{day.avg_temperature} C</span>
                            <span>{day.total_rainfall} mm</span>
                            <span>{day.avg_humidity}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button type="submit" className="w-full h-14 text-base" disabled={predicting || loadingOptions || loadingWeather}>
                      {predicting ? t("price.predicting") : t("price.predict")}
                    </Button>
                    <Button type="button" variant="outline" className="w-full h-14 text-base" onClick={resetForm} disabled={predicting || loadingOptions || loadingWeather}>
                      {t("price.clear")}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle>{t("price.howTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <div className="bg-primary/10 p-3 rounded-full h-fit">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">1. {t("price.date")} + {t("price.district")}</h3>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-secondary/10 p-3 rounded-full h-fit">
                      <CloudRain className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">2. {t("price.getWeather")}</h3>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-accent/10 p-3 rounded-full h-fit">
                      <Brain className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">3. {t("price.predict")}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card shadow-card">
                <CardHeader>
                  <CardTitle>{t("price.dataTitle")}</CardTitle>
                  <CardDescription>{t("price.dataDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-border p-3 bg-card">
                    <p className="font-semibold mb-1 flex items-center gap-2"><Thermometer className="h-4 w-4 text-primary" /> {t("price.temperature")}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 bg-card">
                    <p className="font-semibold mb-1 flex items-center gap-2"><CloudRain className="h-4 w-4 text-primary" /> {t("price.rainfall")}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 bg-card">
                    <p className="font-semibold mb-1 flex items-center gap-2"><Droplets className="h-4 w-4 text-primary" /> {t("price.humidity")}</p>
                  </div>
                </CardContent>
              </Card>

              {prediction && (
                <Card className="shadow-soft border-primary">
                  <CardHeader>
                    <CardTitle className="text-primary">{t("price.results")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">{t("price.currentPrice")}</p>
                        <p className="text-2xl font-bold">{prediction.currency || "LKR"} {prediction.current_price}</p>
                      </div>
                      <div className="bg-primary/10 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">{t("price.predictedPrice")}</p>
                        <p className="text-2xl font-bold text-primary">{prediction.currency || "LKR"} {prediction.predicted_price}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-4 bg-accent/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-accent" />
                      <div>
                        <p className="font-semibold">{t("price.trend")}: {prediction.trend}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("price.change")}: {prediction.change_percent.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-4 bg-secondary/10 rounded-lg">
                      <Calendar className="h-5 w-5 text-secondary" />
                      <div>
                        <p className="font-semibold">{t("price.bestSell")}</p>
                        <p className="text-sm text-muted-foreground">{prediction.best_sell_time}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PricePrediction;
