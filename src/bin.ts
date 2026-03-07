#!/usr/bin/env bun
import { spawn } from "bun";
import { join } from "path";

const { platform, arch } = process;

// Map system to your specific binary filenames
// Example: joty-darwin-arm64, joty-linux-x64
const binaryName = `joty-${platform}-${arch}`;

let binaryPath = join(import.meta.dir, "..", "dist", "bin", binaryName);

if (!import.meta.dir?.includes("node_modules/.bin")) {
  binaryPath = join(import.meta.dir, binaryName);
}

try {
  // Check if the binary exists before trying to run it
  const file = Bun.file(binaryPath);
  if (!(await file.exists())) {
    console.error(`Error: Joty binary not found for ${platform}-${arch}`);
    console.error(`Expected path: ${binaryPath}`);
    process.exit(1);
  }

  // Execute the binary and pipe everything (args, stdin, stdout, stderr)
  const proc = spawn([binaryPath, ...process.argv.slice(2)], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  // Wait for the process to finish and exit with the same code
  const exitCode = await proc.exited;
  process.exit(exitCode);
} catch (err) {
  console.error("Failed to execute joty binary:", err);
  process.exit(1);
}