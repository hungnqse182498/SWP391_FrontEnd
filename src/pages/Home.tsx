import Features from "../components/Features";
import HeroSection from "../components/HeroSection";
import SubscriptionPlans from "../components/SubscriptionPlans";

export default function Home() {
  return (
    <div className="home-landing">
      <HeroSection />
      <SubscriptionPlans />
      <Features />
    </div>
  );
}
