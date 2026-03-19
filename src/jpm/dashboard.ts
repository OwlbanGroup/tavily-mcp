import { EventEmitter } from "events";
import { getJpmOAuthConfig, validateJpmOAuthConfig } from "./config.js";

export interface DashboardHealth {
  serverOnline: boolean;
  websocketConnected: boolean;
  lastUpdate: string;
  missingEnv: string[];
}

export interface DashboardStatus {
  mode: "live" | "offline";
  updateFrequencySeconds: number;
  health: DashboardHealth;
  metrics: {
    accountsLoaded: boolean;
    balancesLoaded: boolean;
    transactionsLoaded: boolean;
    paymentsLoaded: boolean;
  };
}

const dashboardEvents = new EventEmitter();

let lastUpdateIso = "Never";
let websocketConnected = false;

export function setWebsocketConnected(value: boolean): void {
  websocketConnected = value;
  lastUpdateIso = new Date().toISOString();
  dashboardEvents.emit("status", getDashboardStatus());
}

export function markDashboardUpdate(): void {
  lastUpdateIso = new Date().toISOString();
  dashboardEvents.emit("status", getDashboardStatus());
}

export function getDashboardHealth(): DashboardHealth {
  const cfg = getJpmOAuthConfig();
  const missingEnv = validateJpmOAuthConfig(cfg);

  return {
    serverOnline: true,
    websocketConnected,
    lastUpdate: lastUpdateIso,
    missingEnv
  };
}

export function getDashboardStatus(): DashboardStatus {
  const health = getDashboardHealth();
  const configured = health.missingEnv.length === 0;

  return {
    mode: configured ? "live" : "offline",
    updateFrequencySeconds: 5,
    health,
    metrics: {
      accountsLoaded: configured,
      balancesLoaded: configured,
      transactionsLoaded: configured,
      paymentsLoaded: configured
    }
  };
}

export function getDashboardEventEmitter(): EventEmitter {
  return dashboardEvents;
}
