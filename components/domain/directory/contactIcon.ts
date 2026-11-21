import { Camera, Globe, MessageCircle, Phone, Share2, Mail, type LucideIcon } from "lucide-react";
import type { OrganisationContact } from "@/lib/content/types";

/** A decorative icon per contact channel. The visible label always names the channel or shows the value. */
export function contactIcon(channel: OrganisationContact["channel"]): LucideIcon {
  switch (channel) {
    case "phone":
      return Phone;
    case "email":
      return Mail;
    case "website":
      return Globe;
    case "line":
      return MessageCircle;
    case "instagram":
      return Camera;
    case "facebook":
      return Share2;
  }
}
