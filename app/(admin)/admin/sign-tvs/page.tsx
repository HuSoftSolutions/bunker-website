import { redirect } from "next/navigation";
import { LOCATION_ADMIN } from "@/constants/routes";

export default function SignTvAdminRedirect() {
  redirect(`${LOCATION_ADMIN}?view=location&tab=sign-tvs`);
}
