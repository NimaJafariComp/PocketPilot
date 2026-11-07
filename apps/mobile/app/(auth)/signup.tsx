import { Redirect } from "expo-router";

// Public self-service account creation is intentionally disabled. The former
// screen is retained under src/features/future-auth for a future authorized flow.
export default function SignUpRoute() {
  return <Redirect href="/(auth)/signin" />;
}
