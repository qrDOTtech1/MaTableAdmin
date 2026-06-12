import { existsSync } from "fs";
import { spawn, type ChildProcessByStdio } from "child_process";
import type { Readable } from "stream";

export type ProspectScraperStatus = "idle" | "running" | "success" | "error";

export type ProspectScraperState = {
  status: ProspectScraperStatus;
  startedAt: string | null;
  endedAt: string | null;
  exitCode: number | null;
  error: string | null;
  logs: string[];
  available: boolean;
  workdir: string;
  scriptPath: string;
  command: string;
};

const MAX_LOG_LINES = 500;

function getWorkdir() {
  return process.env.PROSPECT_SCRAPER_WORKDIR || "C:/Users/Super/OneDrive/Bureau/MaTable-API";
}

function getScriptPath(workdir = getWorkdir()) {
  const relativeScript = process.env.PROSPECT_SCRAPER_SCRIPT || "scripts/scrape-lacarte.ts";
  return `${workdir.replace(/\\/g, "/")}/${relativeScript}`;
}

function getCommand() {
  return `${process.platform === "win32" ? "npx.cmd" : "npx"} tsx scripts/scrape-lacarte.ts`;
}

function createInitialState(): ProspectScraperState {
  const workdir = getWorkdir();
  const scriptPath = getScriptPath(workdir);

  return {
    status: "idle",
    startedAt: null,
    endedAt: null,
    exitCode: null,
    error: null,
    logs: [],
    available: existsSync(scriptPath),
    workdir,
    scriptPath,
    command: getCommand(),
  };
}

class ProspectScraperController {
  private state: ProspectScraperState = createInitialState();
  private child: ChildProcessByStdio<null, Readable, Readable> | null = null;

  getState(): ProspectScraperState {
    const refreshed = createInitialState();
    this.state = {
      ...this.state,
      available: refreshed.available,
      workdir: refreshed.workdir,
      scriptPath: refreshed.scriptPath,
      command: refreshed.command,
    };

    return { ...this.state, logs: [...this.state.logs] };
  }

  start() {
    if (this.child && this.state.status === "running") {
      return this.getState();
    }

    const current = this.getState();
    if (!current.available) {
      this.state = {
        ...current,
        status: "error",
        endedAt: new Date().toISOString(),
        exitCode: null,
        error: `Script introuvable: ${current.scriptPath}`,
        logs: [
          `[${new Date().toLocaleTimeString("fr-FR")}] Repertoire ou script introuvable.`,
          `[${new Date().toLocaleTimeString("fr-FR")}] Attendu: ${current.scriptPath}`,
        ],
      };
      return this.getState();
    }

    const startedAt = new Date().toISOString();
    this.state = {
      ...current,
      status: "running",
      startedAt,
      endedAt: null,
      exitCode: null,
      error: null,
      logs: [
        `[${new Date().toLocaleTimeString("fr-FR")}] Lancement du scraper...`,
        `[${new Date().toLocaleTimeString("fr-FR")}] ${current.command}`,
        `[${new Date().toLocaleTimeString("fr-FR")}] Workdir: ${current.workdir}`,
      ],
    };

    const bin = process.platform === "win32" ? "npx.cmd" : "npx";
    const child = spawn(bin, ["tsx", "scripts/scrape-lacarte.ts"], {
      cwd: current.workdir,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.child = child;

    const append = (chunk: string, prefix = "") => {
      const lines = chunk
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.trimEnd())
        .filter(Boolean)
        .map((line) => `[${new Date().toLocaleTimeString("fr-FR")}] ${prefix}${line}`);

      if (!lines.length) return;

      this.state.logs = [...this.state.logs, ...lines].slice(-MAX_LOG_LINES);
    };

    child.stdout.on("data", (chunk) => append(String(chunk)));
    child.stderr.on("data", (chunk) => append(String(chunk), "ERR: "));

    child.on("error", (error) => {
      this.state = {
        ...this.state,
        status: "error",
        endedAt: new Date().toISOString(),
        exitCode: null,
        error: error.message,
        logs: [...this.state.logs, `[${new Date().toLocaleTimeString("fr-FR")}] ERREUR: ${error.message}`].slice(-MAX_LOG_LINES),
      };
      this.child = null;
    });

    child.on("close", (code) => {
      this.state = {
        ...this.state,
        status: code === 0 ? "success" : "error",
        endedAt: new Date().toISOString(),
        exitCode: code,
        error: code === 0 ? null : `Le scraper s'est termine avec le code ${code}`,
        logs: [
          ...this.state.logs,
          `[${new Date().toLocaleTimeString("fr-FR")}] Fin du scraping (code ${code ?? "null"}).`,
        ].slice(-MAX_LOG_LINES),
      };
      this.child = null;
    });

    return this.getState();
  }
}

declare global {
  var __prospectScraperController: ProspectScraperController | undefined;
}

export function getProspectScraperController() {
  if (!global.__prospectScraperController) {
    global.__prospectScraperController = new ProspectScraperController();
  }

  return global.__prospectScraperController;
}

export function canRunLocalProspectScraper() {
  return process.env.NODE_ENV !== "production";
}
