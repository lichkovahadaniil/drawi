import { createAuthClient } from "better-auth/client";
import { getServerEnv } from "../env/server";

async function main() {
  const env = getServerEnv();
  const authClient = createAuthClient({
    baseURL: env.BETTER_AUTH_URL,
  });

  for (const account of [
    { email: "tutor@example.com", password: "drawi-password", name: "Tutor" },
    { email: "student@example.com", password: "drawi-password", name: "Student" },
  ]) {
    const result = await authClient.signUp.email(account);
    if (result.error) {
      console.log(`[seed] ${account.email}: ${result.error.message}`);
    } else {
      console.log(`[seed] created ${account.email}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
