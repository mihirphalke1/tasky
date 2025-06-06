import { HowItWorks } from "@/components/HowItWorks";
import NavBar from "@/components/NavBar";
import { PageWrapper } from "@/components/ui/layout";
import { useAuth } from "@/lib/AuthContext";

const HowItWorksPage = () => {
  const { user } = useAuth();

  return (
    <PageWrapper>
      {user && <NavBar />}
      <HowItWorks />
    </PageWrapper>
  );
};

export default HowItWorksPage;
