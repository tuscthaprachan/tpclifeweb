import { sectionRoute } from "@/components/domain/content-page";

const route = sectionRoute("money");
export const generateStaticParams = route.topic.generateStaticParams;
export const generateMetadata = route.topic.generateMetadata;
export default route.topic.Page;
