import { createRequire } from "node:module";
import { resolve } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { build, createServer, loadConfigFromFile } from "vite";
import { afterEach, describe, expect, it, vi } from "vitest";

const webRoot = resolve("apps/web");
const configFile = resolve(webRoot, "vite.config.ts");
const webRequire = createRequire(resolve(webRoot, "package.json"));
afterEach(() => vi.unstubAllEnvs());

describe("web React boundary", () => {
  it("resolves the renderer and every shared provider to web React in development", async () => {
    const server = await createServer({
      root: webRoot,
      configFile,
      server: { middlewareMode: true },
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    try {
      const resolveId = server.config.createResolver();
      for (const importer of [
        webRequire.resolve("react-dom"),
        ...["services-provider", "auth-context", "data-context"].map((name) =>
          resolve(`packages/services/src/react/${name}.tsx`)
        ),
      ]) {
        for (const name of ["react", "react/jsx-runtime", "react/jsx-dev-runtime"]) {
          const result = await resolveId(name, importer);
          expect(result?.replaceAll("\\", "/")).toBe(
            webRequire.resolve(name).replaceAll("\\", "/")
          );
        }
      }
    } finally {
      await server.close();
    }
  });

  it("bundles one React and mounts shared providers with working hooks and effects", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const loaded = await loadConfigFromFile({ command: "build", mode: "production" }, configFile);
    const result = await build({
      ...loaded.config,
      root: webRoot,
      configFile: false,
      logLevel: "silent",
      build: {
        write: false,
        minify: false,
        lib: {
          entry: resolve(webRoot, "tests/providers.fixture.tsx"),
          name: "ProviderSmoke",
          formats: ["iife"],
        },
        rollupOptions: { output: { inlineDynamicImports: true } },
      },
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
    });
    vi.unstubAllEnvs();
    const chunks = (Array.isArray(result) ? result : [result])
      .flatMap((output) => output.output)
      .filter((item) => item.type === "chunk");
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("jsdomError", (error) => errors.push(error.message));
    virtualConsole.on("error", (...args) => errors.push(args.join(" ")));
    const dom = new JSDOM('<div id="root"></div>', {
      url: "http://localhost/",
      runScripts: "outside-only",
      virtualConsole,
    });
    dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    try {
      for (const chunk of chunks) dom.window.eval(chunk.code);
      await expect
        .poll(() => dom.window.document.querySelector("button")?.textContent)
        .toBe("signed-out:services-ok:0");
      dom.window.document.querySelector("button").click();
      await expect
        .poll(() => dom.window.document.querySelector("button")?.textContent)
        .toBe("signed-out:services-ok:1");
      expect(errors).toEqual([]);
      const modules = chunks
        .flatMap((chunk) => Object.keys(chunk.modules))
        .map((id) => id.replaceAll("\\", "/").replace(/^\0/, ""));
      const reactRoots = new Set(
        modules
          .filter((id) => /\/node_modules\/react\//.test(id))
          .map((id) => id.split("/node_modules/react/")[0])
      );
      expect([...reactRoots]).toEqual([webRoot.replaceAll("\\", "/")]);
    } finally {
      dom.window.unmountProviders?.();
      dom.window.close();
    }
  }, 30000);
});
