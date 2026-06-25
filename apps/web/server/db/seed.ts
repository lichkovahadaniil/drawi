import { createAuthClient } from "better-auth/client";

async function main() {
  const baseURL = process.env.BETTER_AUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";
  const authClient = createAuthClient({
    baseURL,
    fetchOptions: {
      headers: {
        origin: baseURL,
      },
    },
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
