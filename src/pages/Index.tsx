import { PageLayout } from "@/components/PageLayout";
import { HeroSection } from "@/components/HeroSection";
import { ScrollIndicator } from "@/components/ScrollIndicator";
import { FeaturesSection } from "@/components/FeaturesSection";

const Index = () => (
  <PageLayout>
    <HeroSection />
    <ScrollIndicator />
    <FeaturesSection />
  </PageLayout>
);

export default Index;
