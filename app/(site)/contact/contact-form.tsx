"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CONTACT_CATEGORIES,
  MAX_CONTACT_LENGTH,
  type ContactCategory,
} from "@/lib/contact";

const fieldClass =
  "rounded-sm border-black/40 shadow-none focus-visible:border-black focus-visible:ring-black/20";

export default function ContactForm() {
  const [category, setCategory] = useState<ContactCategory | "">("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  // Honeypot — hidden from people, irresistible to bots. Never submitted full.
  const [website, setWebsite] = useState("");
  const [isSending, setIsSending] = useState(false);

  const tooLong = message.length > MAX_CONTACT_LENGTH;
  const canSend = Boolean(category) && Boolean(message.trim()) && !tooLong && !isSending;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    setIsSending(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message, email, website }),
      });
      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || "Could not send that");
        return;
      }

      toast.success(result.message);
      setCategory("");
      setMessage("");
      setEmail("");
    } catch (error) {
      console.error("Error sending contact message:", error);
      toast.error("Could not send that. Try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6 max-w-xl">
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold pb-3">What is this about?</legend>
        <RadioGroup
          value={category}
          onValueChange={(value) => setCategory(value as ContactCategory)}
          className="gap-3"
        >
          {CONTACT_CATEGORIES.map((option) => (
            <div key={option.value} className="flex items-center gap-3">
              <RadioGroupItem
                value={option.value}
                id={`contact-${option.value}`}
                className="border-black/40 text-black"
              />
              <Label
                htmlFor={`contact-${option.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-message" className="text-sm font-semibold">
          Tell us what happened
        </Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What you were doing, what you expected, and what the site did instead."
          className={fieldClass}
          rows={6}
          required
        />
        <span
          className={`text-xs ${tooLong ? "text-red-700" : "text-black/50"}`}
          aria-live="polite"
        >
          {message.length} / {MAX_CONTACT_LENGTH}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-email" className="text-sm font-semibold">
          Email <span className="font-light text-black/50">(optional)</span>
        </Label>
        <Input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Only if you want an answer back"
          className={fieldClass}
        />
      </div>

      {/* Honeypot: off-screen rather than display:none, which some bots skip */}
      <div className="absolute left-[-9999px]" aria-hidden>
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <Button
        type="submit"
        disabled={!canSend}
        className="w-fit rounded-sm bg-black text-white hover:bg-black/80 px-5 py-3"
      >
        {isSending ? "Sending…" : "Send it"}
      </Button>
    </form>
  );
}
