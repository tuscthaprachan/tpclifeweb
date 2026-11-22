import { sectionRoute } from "@/components/domain/content-page";

const route = sectionRoute("start");
export const generateImageMetadata = route.hub.generateImageMetadata;
export default route.hub.Image;
