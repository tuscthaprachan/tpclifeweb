import { Globe, MapPin, MessageCircle, Mail, Phone, type LucideIcon } from "lucide-react";

/** The icon for a help contact's channel (phone, email, LINE, a web page, a room). Always shown beside its text label. */
export function helpChannelIcon(channel: "line" | "email" | "phone" | "inPerson" | "url"): LucideIcon {
  switch (channel) {
    case "phone":
      return Phone;
    case "email":
      return Mail;
    case "line":
      return MessageCircle;
    case "url":
      return Globe;
    case "inPerson":
      return MapPin;
  }
}
