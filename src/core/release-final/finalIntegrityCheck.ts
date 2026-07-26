/**
 * finalIntegrityCheck.ts — Verificação industrial (somente leitura).
 */

import type { EuropeanDrawerResult } from "../drawers/european/types";
import type { KitchenLibrary } from "../kitchen";
import type { PlannerState } from "../planner";
import type { ComponentStatus } from "./finalVersioning";

export type IntegrityCheckItem = {
  id: string;
  ok: boolean;
  status: ComponentStatus;
  message: string;
};

export type FinalIntegrityReport = {
  ok: boolean;
  items: IntegrityCheckItem[];
  industrialOk: boolean;
  cncOk: boolean;
  pricingOk: boolean;
  plannerOk: boolean;
  kitchenOk: boolean;
  nothingMutated: true;
};

function item(
  id: string,
  ok: boolean,
  message: string,
  warnAsMissing = false
): IntegrityCheckItem {
  return {
    id,
    ok,
    status: ok ? "OK" : warnAsMissing ? "MISSING" : "WARN",
    message,
  };
}

/**
 * Valida presença/integridade dos artefactos sem alterar o result.
 */
export function runFinalIntegrityCheck(input: {
  result?: EuropeanDrawerResult | null;
  library?: KitchenLibrary | null;
  planner?: PlannerState | null;
}): FinalIntegrityReport {
  const items: IntegrityCheckItem[] = [];
  const r = input.result;

  items.push(
    item(
      "geometry",
      Boolean(r?.geometry && r.geometry.externalWidthMm > 0),
      r?.geometry ? `externalWidthMm=${r.geometry.externalWidthMm}` : "geometry ausente"
    )
  );
  items.push(
    item(
      "holes",
      Array.isArray(r?.holes) && (r?.holes.length ?? 0) > 0,
      `holes=${r?.holes?.length ?? 0}`
    )
  );
  items.push(
    item(
      "cutlist",
      Array.isArray(r?.cutlist) && (r?.cutlist.length ?? 0) > 0,
      `cutlist=${r?.cutlist?.length ?? 0}`
    )
  );
  items.push(
    item(
      "dxf",
      Boolean(r?.dxf?.document),
      r?.dxf ? `dxf=${r.dxf.report?.status ?? "present"}` : "dxf ausente"
    )
  );
  items.push(
    item(
      "technical",
      Boolean(r?.technical),
      r?.technical ? `views=${r.technical.viewIds?.length ?? 0}` : "technical ausente"
    )
  );
  items.push(
    item(
      "overlay",
      Boolean(r?.overlay),
      r?.overlay ? `overlay=${r.overlay.report?.status}` : "overlay ausente"
    )
  );
  items.push(
    item(
      "docs",
      Boolean(r?.docs),
      r?.docs ? `docs=${r.docs.report?.status}` : "docs ausente"
    )
  );
  items.push(
    item(
      "cnc-ready",
      Boolean(r?.geometry && r?.holes && r?.dxf),
      "CNC deriva de geometry+holes+dxf (Fase 17)"
    )
  );
  items.push(
    item(
      "pricing",
      Boolean(r?.pricing) && (r?.pricing?.totals.costIndustrial ?? -1) >= 0,
      r?.pricing
        ? `pricing=${r.pricing.report.status} cost=${r.pricing.totals.costIndustrial}`
        : "pricing ausente"
    )
  );

  const lib = input.library;
  items.push(
    item(
      "kitchen-library",
      Boolean(lib && lib.modules.all.length > 0),
      lib
        ? `modules=${lib.modules.all.length} status=${lib.report.status}`
        : "kitchen library ausente"
    )
  );

  const planner = input.planner;
  items.push(
    item(
      "planner",
      Boolean(planner?.library && planner.grid),
      planner
        ? `planner=${planner.report.status} modules=${planner.modules.length}`
        : "planner ausente",
      !planner
    )
  );

  const byId = (id: string) => items.find((i) => i.id === id)?.ok ?? false;

  const industrialOk =
    byId("geometry") && byId("holes") && byId("cutlist") && byId("dxf") && byId("overlay");
  const cncOk = byId("cnc-ready");
  const pricingOk = byId("pricing");
  const kitchenOk = byId("kitchen-library");
  const plannerOk = input.planner ? byId("planner") : true;

  const required = items.filter((i) => i.id !== "planner" || Boolean(input.planner));
  const ok = required.every((i) => i.ok);

  return {
    ok,
    items,
    industrialOk,
    cncOk,
    pricingOk,
    plannerOk,
    kitchenOk,
    nothingMutated: true,
  };
}
