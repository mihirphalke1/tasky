import React, { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { useNavigate } from "react-router-dom";
import ContactModal from "@/components/ContactModal";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
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
            Terms and Conditions
          </h1>
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 text-center">
            <strong>
              By using Tasky, you agree to these Terms and Conditions.
            </strong>
          </div>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">1. Use of the App</h2>
            <ul className="list-disc pl-6">
              <li>
                Tasky is a productivity tool designed to help you manage tasks,
                notes, and focus sessions.
              </li>
              <li>You must be at least 13 years old to use Tasky.</li>
              <li>
                You are responsible for maintaining the confidentiality of your
                account and password.
              </li>
            </ul>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">2. Data and Content</h2>
            <ul className="list-disc pl-6">
              <li>
                Tasky allows you to create, edit, and store tasks, notes, and
                related information.
              </li>
              <li>
                <strong>Do not store sensitive personal information</strong>{" "}
                (such as passwords, credit card numbers, government IDs, or
                confidential business data) in Tasky. The app is not designed
                for high-security or regulated data.
              </li>
              <li>
                We are not responsible for any data loss, corruption, or
                unauthorized access. Use Tasky at your own risk.
              </li>
            </ul>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">
              3. Data Loss and Backups
            </h2>
            <ul className="list-disc pl-6">
              <li>
                While we strive to keep your data safe, Tasky may experience
                bugs, outages, or data loss due to technical issues, software
                updates, or unforeseen circumstances.
              </li>
              <li>
                <strong>
                  We do not guarantee the availability, accuracy, or security of
                  your data.
                </strong>
              </li>
              <li>
                You are solely responsible for backing up any important
                information.
              </li>
            </ul>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">
              4. Security and Limitations
            </h2>
            <ul className="list-disc pl-6">
              <li>
                Tasky uses modern web technologies and cloud services, but may
                have security vulnerabilities inherent to web applications.
              </li>
              <li>
                We do not guarantee that Tasky is free from bugs,
                vulnerabilities, or unauthorized access.
              </li>
              <li>
                By using Tasky, you acknowledge these risks and agree that we
                are not liable for any damages or losses.
              </li>
            </ul>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">
              5. AI-Assisted Development
            </h2>
            <ul className="list-disc pl-6">
              <li>
                Tasky is developed using AI-assisted tools and code generation.
                While we aim for high quality, this may introduce unexpected
                behaviors or errors.
              </li>
            </ul>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">
              6. Changes to the Service
            </h2>
            <ul className="list-disc pl-6">
              <li>
                We may update, modify, or discontinue Tasky at any time without
                notice.
              </li>
              <li>
                We reserve the right to change these terms at any time.
                Continued use of Tasky means you accept the updated terms.
              </li>
            </ul>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">
              7. Disclaimer and Limitation of Liability
            </h2>
            <ul className="list-disc pl-6">
              <li>
                Tasky is provided "as is" and "as available" without warranties
                of any kind.
              </li>
              <li>
                <strong>
                  We disclaim all responsibility for any direct, indirect,
                  incidental, or consequential damages arising from your use of
                  Tasky.
                </strong>
              </li>
            </ul>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">8. Contact</h2>
            <p>For questions, fill out the "Contact Developer" form below.</p>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">9. Project Purpose</h2>
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
        context="terms"
      />
    </div>
  );
};

export default Terms;
