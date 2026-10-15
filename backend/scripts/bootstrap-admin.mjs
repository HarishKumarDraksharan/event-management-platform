import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readHiddenPassword(prompt) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    if (!input.isTTY || typeof input.setRawMode !== "function") {
      reject(new Error("Run the bootstrap command with an interactive terminal."));
      return;
    }

    let password = "";
    const cleanup = () => {
      input.setRawMode(false);
      input.pause();
      input.removeListener("data", onData);
    };
    const onData = (chunk) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("Admin bootstrap cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve(password);
          return;
        }
        if (character === "\u007f" || character === "\b") password = password.slice(0, -1);
        else if (character >= " ") password += character;
      }
    };

    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

let prisma;
try {
  const jiti = createJiti(fileURLToPath(import.meta.url));
  const { prisma: database } = await jiti.import("../lib/prisma.ts");
  prisma = database;

  const email = argument("email")?.trim().toLowerCase();
  const name = argument("name")?.trim() || "TSG EVENTS Administrator";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Supply a valid address with --email.");
  }
  if (name.length > 100) throw new Error("The administrator name must be 100 characters or fewer.");

  const existing = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  if (existing?.role === "admin") {
    process.stdout.write("That administrator already exists; no changes were made.\n");
  } else if (existing) {
    throw new Error("That address belongs to a non-admin account. No changes were made.");
  } else {
    const password = await readHiddenPassword("Admin password (14–128 characters, hidden): ");
    if (password.length < 14 || password.length > 128) {
      throw new Error("The password must be 14–128 characters. No account was created.");
    }
    const confirmation = await readHiddenPassword("Confirm password: ");
    if (password !== confirmation) throw new Error("Passwords did not match. No account was created.");

    try {
      const { auth } = await jiti.import("../lib/auth.ts");
      await auth.api.createUser({ body: { email, name, password, role: "admin" } });
    } catch {
      const concurrentlyCreated = await prisma.user.findUnique({ where: { email }, select: { role: true } });
      if (concurrentlyCreated?.role !== "admin") {
        throw new Error("Administrator creation failed; no existing data was changed.");
      }
    }
    const created = await prisma.user.findUnique({ where: { email }, select: { role: true } });
    if (created?.role !== "admin") throw new Error("Admin creation could not be confirmed.");
    process.stdout.write("Administrator created. The password was not displayed.\n");
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Admin bootstrap failed."}\n`);
  process.exitCode = 1;
} finally {
  if (prisma) await prisma.$disconnect();
}
