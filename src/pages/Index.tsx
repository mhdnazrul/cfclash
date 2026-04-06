import { PageLayout } from "@/components/PageLayout";
import { HeroSection } from "@/components/HeroSection";
import { ScrollIndicator } from "@/components/ScrollIndicator";
import { FeaturesSection } from "@/components/FeaturesSection";
import { Footer } from "@/components/Footer";

const Index = () => (
  <PageLayout>
    <HeroSection />
    <ScrollIndicator />
    <FeaturesSection />
    <Footer />
  </PageLayout>
);

export default Index;
