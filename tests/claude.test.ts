import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { runClaude } from "../server/claude";

async function withClaude(script: string, run: () => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "enhancer-cli-test-"));
  const executable = join(directory, "claude");
  const previousPath = process.env.PATH;
  await writeFile(executable, `#!${process.execPath}\n${script}`);
  await chmod(executable, 0o755);
  process.env.PATH = directory;
  try { await run(); } finally { process.env.PATH = previousPath; await rm(directory, { recursive: true, force: true }); }
}

test("Claude receives private prompt on stdin with tools and sessions disabled", async () => {
  await withClaude(`
    const args = process.argv.slice(2);
    const required = ['--safe-mode', '--tools', '--strict-mcp-config', '--no-session-persistence', '--effort', 'low'];
    if (required.some(x => !args.includes(x)) || args[args.indexOf('--tools') + 1] !== '' || args.join(' ').includes('private draft')) process.exit(2);
    let data = ''; process.stdin.on('data', chunk => data += chunk).on('end', () => {
      process.stdout.write(JSON.stringify({is_error: false, result: data, num_turns: 1}));
    });`, async () => assert.equal(await runClaude("private draft", "claude-sonnet-5[1m]"), "private draft"));
});

test("Claude rejects invalid, failed and multi-turn responses", async () => {
  const cases: Array<[string, RegExp]> = [
    ["invalid", /invalid response/],
    [JSON.stringify({is_error: true, result: "error"}), /successful single-turn response/],
    [JSON.stringify({is_error: false, result: "text", num_turns: 2}), /successful single-turn response/],
    [JSON.stringify({is_error: false, result: " "}), /successful single-turn response/],
  ];
  for (const [response, error] of cases) {
    await withClaude(`process.stdout.write(${JSON.stringify(response)});`, async () => assert.rejects(runClaude("draft", "model"), error));
  }
});

test("Claude cancellation stops the subprocess", async () => {
  await withClaude("setInterval(() => {}, 1000);", async () => {
    const controller = new AbortController();
    const promise = runClaude("draft", "model", controller.signal);
    setTimeout(() => controller.abort(), 100);
    await assert.rejects(promise, /cancelled/);
  });
});

test("enabled Claude fast mode routes enhancement through the CLI", async () => {
  const { runEnhancement } = await import("../server/enhance");
  const { settingsSchema } = await import("../shared/settings");
  await withClaude(`process.stdin.resume(); process.stdin.on('end', () => process.stdout.write(JSON.stringify({is_error:false,result:'Improved',num_turns:1})));`, async () => {
    const settings = settingsSchema.parse({provider:'claude',model:'model',claudeFastMode:true});
    const input = {workspaceId:'workspace',agentId:'agent',draft:'draft',instruction:'clarify',historyLimit:0,includeTools:false};
    const api = {} as Parameters<typeof runEnhancement>[0];
    assert.equal(await runEnhancement(api, input, settings), 'Improved');
  });
});
