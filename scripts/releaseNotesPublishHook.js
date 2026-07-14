// pimo-kep-fix-003 — protegido, não modificar sem autorização

import {
  appendPublicationEntry,
  capturePrePublishCommitInfo,
} from "./releaseNotesRegistry.js";

const VALID_FLOWS = new Set(["publish", "deploy"]);

export function resolvePublishFlow(explicitFlow) {
  const candidate = explicitFlow || process.env.PIMO_PUBLISH_FLOW || "publish";
  return VALID_FLOWS.has(candidate) ? candidate : "publish";
}

export function registerPublicationForFlow(rootDir, runOutput, version, explicitFlow) {
  const publishFlow = resolvePublishFlow(explicitFlow);
  const releaseCommitInfo = capturePrePublishCommitInfo(runOutput);

  appendPublicationEntry(rootDir, {
    publishedAt: new Date().toISOString(),
    author: releaseCommitInfo.author,
    commitMessage: releaseCommitInfo.commitMessage,
    version,
  });

  console.log(`Release notes: registo executado (fluxo ${publishFlow}, versao ${version}).`);
}
