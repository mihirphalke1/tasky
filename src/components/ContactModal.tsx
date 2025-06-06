import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import ReactDOM from "react-dom";

const QUERY_TYPES = [
  "General Query",
  "Report Bug",
  "Privacy Concern",
  "Feature Request",
  "Other",
];

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xnnvjjng"; // Replace with your Formspree endpoint

export default function ContactModal({
  open,
  onClose,
  context,
}: {
  open: boolean;
  onClose: () => void;
  context?: string;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    type: "General Query",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const effectiveForm = isLoggedIn
    ? {
        ...form,
        name: user?.displayName || "",
        email: user?.email || "",
      }
    : form;

  useEffect(() => {
    if (open && initialFocusRef.current) {
      initialFocusRef.current.focus();
    }
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc, true);
    return () => window.removeEventListener("keydown", handleEsc, true);
  }, [open, onClose]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...effectiveForm, context }),
      });
      if (res.ok) {
        setSuccess(true);
        setForm({ name: "", email: "", type: "General Query", message: "" });
      } else {
        setError("Something went wrong. Please try again later.");
      }
    } catch {
      setError("Something went wrong. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-lg mx-2 bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none"
              onClick={onClose}
              aria-label="Close contact form"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold mb-2 text-center">
              Contact Developer
            </h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Have a question, found a bug, or want to give feedback? Fill out
              the form below and we'll get back to you soon.
            </p>
            {success ? (
              <div className="text-green-600 text-center font-medium py-8">
                Thank you! Your message has been sent.
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                {isLoggedIn ? (
                  <div className="mb-2 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded p-2 text-center">
                    Your profile name and email will be used for this
                    submission:
                    <br />
                    <span className="font-semibold">
                      {user?.displayName || "(No Name)"}
                    </span>{" "}
                    (<span className="font-mono">{user?.email}</span>)
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      <label htmlFor="name" className="font-medium text-sm">
                        Name (optional)
                      </label>
                      <input
                        ref={initialFocusRef}
                        type="text"
                        id="name"
                        name="name"
                        className="input input-bordered rounded px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#CDA351]"
                        value={form.name}
                        onChange={handleChange}
                        autoComplete="name"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label htmlFor="email" className="font-medium text-sm">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        className="input input-bordered rounded px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#CDA351]"
                        value={form.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </>
                )}
                <div className="flex flex-col gap-2">
                  <label htmlFor="type" className="font-medium text-sm">
                    Query Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="type"
                    name="type"
                    className="input input-bordered rounded px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#CDA351]"
                    value={form.type}
                    onChange={handleChange}
                    required
                  >
                    {QUERY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="message" className="font-medium text-sm">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    className="input input-bordered rounded px-3 py-2 min-h-[100px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#CDA351]"
                    value={form.message}
                    onChange={handleChange}
                    required
                  />
                </div>
                {context && (
                  <input type="hidden" name="context" value={context} />
                )}
                {error && (
                  <div className="text-red-600 text-sm text-center">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full bg-[#CDA351] hover:bg-[#b8933e] text-white font-semibold py-2 rounded transition-all duration-200 disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
