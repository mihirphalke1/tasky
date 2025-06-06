import React, { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { useNavigate } from "react-router-dom";
import ContactModal from "@/components/ContactModal";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate(-1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF8F6] to-[#EFE7DD] dark:from-gray-900 dark:to-gray-800 flex flex-col">
      <NavBar />
      <main className="flex-1 flex items-center justify-center px-2 py-8">
        <div className="w-full max-w-2xl bg-white/95 dark:bg-gray-900/95 rounded-xl shadow-lg p-6 sm:p-10 text-base text-gray-800 dark:text-gray-200">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-[#CDA351] font-medium"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </Button>
          </div>

          <h1 className="text-3xl font-bold mb-6 text-center">
            Privacy Policy
          </h1>
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 text-center">
            <strong>By using Tasky, you agree to this Privacy Policy.</strong>
          </div>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">
              1. Information We Collect
            </h2>
            <ul className="list-disc pl-6">
              <li>
                <strong>Account Information:</strong> If you sign in, we collect
                your email and basic profile info from your authentication
                provider (e.g., Google).
              </li>
              <li>
                <strong>Task and Note Data:</strong> We store the tasks, notes,
                and settings you create in Tasky.
              </li>
              <li>
                <strong>Usage Data:</strong> We may collect anonymized usage
                data to improve the app.
              </li>
            </ul>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6">
              <li>To provide and improve Tasky's features.</li>
              <li>To communicate with you about updates or issues.</li>
              <li>To analyze usage trends (in aggregate, not individually).</li>
            </ul>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">
              3. Data Storage and Security
            </h2>
            <ul className="list-disc pl-6">
              <li>Your data is stored in cloud databases (e.g., Firebase).</li>
              <li>
                We use standard security practices, but{" "}
                <strong>cannot guarantee absolute security</strong>.
              </li>
              <li>
                <strong>
                  Do not store sensitive or confidential information in Tasky.
                </strong>
              </li>
              <li>
                In the event of a data breach or loss, we are not responsible
                for any damages.
              </li>
            </ul>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">4. Data Sharing</h2>
            <ul className="list-disc pl-6">
              <li>
                We do not sell or share your personal data with third parties,
                except as required by law or to operate the service (e.g., cloud
                hosting providers).
              </li>
            </ul>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">
              5. Children's Privacy
            </h2>
            <ul className="list-disc pl-6">
              <li>
                Tasky is not intended for children under 13. We do not knowingly
                collect data from children.
              </li>
            </ul>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">
              6. AI-Assisted Development
            </h2>
            <ul className="list-disc pl-6">
              <li>
                Tasky is built using AI-assisted tools, which may affect how
                data is processed or stored.
              </li>
            </ul>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">
              7. Changes to This Policy
            </h2>
            <ul className="list-disc pl-6">
              <li>
                We may update this policy. Continued use of Tasky means you
                accept the updated policy.
              </li>
            </ul>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">8. Your Choices</h2>
            <ul className="list-disc pl-6">
              <li>
                You may delete your account or data at any time by contacting
                us.
              </li>
            </ul>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">9. Contact</h2>
            <p>
              For privacy questions, fill out the "Contact Developer" form
              below.
            </p>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">10. Project Purpose</h2>
            <p>Tasky is a project made for learning purposes.</p>
          </section>
          <button
            className="mt-8 w-full bg-[#CDA351] hover:bg-[#b8933e] text-white font-semibold py-2 rounded transition-all duration-200"
            onClick={() => setContactOpen(true)}
          >
            Contact Developer
          </button>
        </div>
      </main>
      <ContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        context="privacy"
      />
    </div>
  );
};

export default Privacy;
