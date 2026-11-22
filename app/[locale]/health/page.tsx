import { sectionRoute } from "@/components/domain/content-page";

const route = sectionRoute("health");
export const generateMetadata = route.hub.generateMetadata;
export default route.hub.Page;
