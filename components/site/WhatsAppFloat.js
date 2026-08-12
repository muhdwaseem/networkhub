import { waLink } from "@/lib/enquiry";

export default function WhatsAppFloat({ settings }) {
  if (!settings.whatsappNumber) return null;

  return (
    <a
      href={waLink(settings)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg shadow-emerald-900/20 transition-transform hover:scale-105"
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-whatsapp opacity-40" />
      <svg viewBox="0 0 32 32" className="relative h-7 w-7 fill-white">
        <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.34.65 4.53 1.78 6.4L4 29l7.78-1.74A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.6c-1.98 0-3.83-.55-5.41-1.5l-.39-.23-4.62 1.03 1.05-4.5-.25-.4A9.55 9.55 0 0 1 5.6 15c0-5.19 4.22-9.4 9.4-9.4 5.19 0 9.4 4.21 9.4 9.4 0 5.19-4.21 9.6-9.4 9.6Zm5.15-7.03c-.28-.14-1.66-.82-1.92-.91-.26-.1-.44-.14-.63.14-.18.28-.72.91-.88 1.1-.16.18-.32.2-.6.07-.28-.14-1.18-.44-2.24-1.4-.83-.74-1.39-1.66-1.55-1.94-.16-.28-.02-.43.12-.57.13-.13.28-.32.42-.49.14-.16.18-.28.28-.46.09-.18.05-.35-.02-.49-.07-.14-.63-1.53-.87-2.1-.23-.55-.46-.48-.63-.49h-.54c-.18 0-.49.07-.74.35-.26.28-.97.95-.97 2.32 0 1.37 1 2.7 1.14 2.88.14.18 1.97 3.01 4.78 4.22.67.29 1.19.46 1.6.59.67.21 1.28.18 1.76.11.54-.08 1.66-.68 1.89-1.33.24-.65.24-1.21.17-1.33-.07-.11-.25-.18-.53-.32Z" />
      </svg>
    </a>
  );
}
