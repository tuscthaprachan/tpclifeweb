import type { ConsoleIconName } from "@/components/admin/icons";
import type { FormSummary } from "@/components/domain/rich-text/types";
import type { ImageChoice } from "@/lib/admin/content/images";
import type { AdminKey } from "@/lib/i18n/admin";
import type { BlockType } from "@/lib/rich-text/editor";
import type { ReferenceChoice } from "../ReferencePicker";

/** Pictures and forms the editor's custom blocks can point at. */
export interface RichTextRefs {
  images: ImageChoice[];
  forms: (ReferenceChoice & { preview?: FormSummary })[];
  storageConfigured: boolean;
}

export const BLOCK_LABEL: Record<BlockType, AdminKey> = {
  contactBlock: "blockContact",
  formCallout: "blockForm",
  image: "blockImage",
  linkOut: "blockLinkOut",
  calloutBox: "blockCallout",
  stepList: "blockSteps",
  liveTimeline: "blockTimeline",
  keyFacts: "blockFacts",
};

export const BLOCK_ICON: Record<BlockType, ConsoleIconName> = {
  contactBlock: "blockContact",
  formCallout: "forms",
  image: "images",
  linkOut: "blockLinkOut",
  calloutBox: "blockCallout",
  stepList: "blockSteps",
  liveTimeline: "blockTimeline",
  keyFacts: "blockFacts",
};
