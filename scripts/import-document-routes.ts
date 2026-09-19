import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

type RouteVariant = {
  operator: string;
  routeName: string;
  routeStops: string[];
  source: string;
};

type ExistingTransport = {
  _id: unknown;
  name: string;
  slug: string;
  imageUrl?: string;
  color?: string;
  dataStatus?: string;
  routeVariants?: Array<{ routeStops: string[] }>;
  [key: string]: unknown;
};

const HEADER_NOISE = /^(?:menu|dhaka local|buses?|routes?|starting|and|end|time|seating|service|seating\/non-|city service bus list)/i;
const ROUTE_NOISE = /(?:Starting|Seating\/Non-Seating|Semi-Sitting|Sitting Service|Check System|Dhaka Local|City Service Bus List)/i;
const CELL_NOISE = /^(?:Semi-?|Half-?|Sitting|Service|System\)?|\d{1,2}:\d{2}|am|pm)(?:\s*[–-])?$/i;
const COLORS = ["#ff5c35", "#21765b", "#4969d1", "#f2a734", "#923f87", "#1689a8", "#bf4b64", "#46765b"];
const CANONICAL_NAMES: Record<string, string> = {
  alif: "Alif Paribahan",
  baishakhi: "Baishakhi Paribahan",
  bihanga: "Bihanga Paribahan",
  raida: "Raida Enterprise",
};

function compact(value: string) {
  return value.replace(/\f/g, " ").replace(/\s+/g, " ").trim();
}

function cleanOperator(value: string) {
  const cleaned = compact(value)
    .replace(/\([^)]*$/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\b(?:Bus\s+Route|Route)\b/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[^A-Za-z]+|[^A-Za-z0-9]+$/g, "")
    .trim();
  const seen = new Set<string>();
  const words = cleaned.split(" ").filter((word) => {
    const key = word.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return words.join(" ").replace(/\s+Bus$/i, "").trim();
}

function operatorKey(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(?:bus|paribahan|paribahon|paribhaban|transport|service|enterprise|express)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function cleanStop(value: string) {
  return compact(value)
    .replace(/^[-–—⇄↔]+|[-–—⇄↔]+$/g, "")
    .replace(/\bSee Full Route Map\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitColumns(rawLine: string) {
  const line = rawLine.replace(/\f/g, "").replace(/\s+$/g, "");
  if (!line.trim()) return { left: "", route: "" };
  if (/^\s{10,}/.test(line)) return { left: "", route: line.trim() };
  const match = line.trimStart().match(/^(.+?)\s{2,}(.+)$/);
  if (match) return { left: match[1].trim(), route: match[2].trim() };
  return { left: line.trim(), route: "" };
}

function parsePdfText(text: string, source: string) {
  const records: RouteVariant[] = [];
  const failed: Array<{ operator: string; stops: number; preview: string }> = [];
  let block: string[] = [];

  const parseBlock = (lines: string[]) => {
    const operatorParts: string[] = [];
    const routeParts: string[] = [];
    for (const rawLine of lines) {
      const { left, route } = splitColumns(rawLine);
      if (left && !HEADER_NOISE.test(left) && !/See Full Route Map/i.test(left)) {
        const ascii = left.replace(/\([^)]*$/g, "").replace(/[^\x20-\x7E]/g, "").trim();
        if (ascii.length > 1 && !HEADER_NOISE.test(ascii)) operatorParts.push(ascii);
      }
      if (route && !/See Full Route Map/i.test(route) && !HEADER_NOISE.test(route)) {
        const useful = route.split(/\s{5,}/)[0].trim();
        if (useful && !ROUTE_NOISE.test(useful) && !CELL_NOISE.test(useful)) routeParts.push(useful);
      }
    }

    const operator = cleanOperator(operatorParts.join(" "));
    let routeText = compact(routeParts.join(" "))
      .replace(/\s*-\s*⇄\s*/g, " ⇄ ")
      .replace(/\s+(?:–|—)\s+/g, " ⇄ ")
      .replace(/\s+-\s+/g, " ⇄ ");
    const noiseAt = routeText.search(ROUTE_NOISE);
    if (noiseAt >= 0) routeText = routeText.slice(0, noiseAt);
    const stops = routeText.split(/\s*(?:⇄|↔)\s*/).map(cleanStop).filter((stop) => stop.length > 1 && !HEADER_NOISE.test(stop));

    if (operator.length >= 2 && operator.length <= 80 && stops.length >= 2) {
      records.push({ operator, routeName: `${stops[0]} ↔ ${stops.at(-1)}`, routeStops: stops, source });
    } else if (operatorParts.length || routeParts.length) {
      failed.push({ operator: operator || compact(operatorParts.join(" ")), stops: stops.length, preview: routeText.slice(0, 180) });
    }
  };

  const tableStart = text.indexOf("Dhaka Local Bus List");
  const tableText = tableStart >= 0 ? text.slice(tableStart) : text;
  for (const line of tableText.replace(/\r/g, "").split("\n")) {
    block.push(line);
    if (/See Full Route Map/i.test(line)) {
      parseBlock(block);
      block = [];
    }
  }
  return { records, failed };
}

function extractAsciiStrings(buffer: Buffer) {
  const matches = buffer.toString("latin1").match(/[\x20-\x7E]{5,}/g) || [];
  return matches.map(compact).filter(Boolean);
}

function parseLegacyDoc(buffer: Buffer, source: string) {
  const strings = extractAsciiStrings(buffer);
  const records: RouteVariant[] = [];
  let current: { operator: string; from: string; to: string; lines: string[] } | null = null;

  const finish = () => {
    if (!current) return;
    const intermediate = current.lines
      .filter((line) => !HEADER_NOISE.test(line) && !/^(?:Microsoft|Normal|Title|Root Entry|Data|WordDocument|Summary|DocumentSummary|CompObj|Table|No List|List Paragraph|hoteldescription|urn:)/i.test(line))
      .flatMap((line) => line.split(","))
      .map(cleanStop)
      .filter((stop) => stop.length > 1);
    const from = cleanStop(current.from);
    const to = cleanStop(current.to.replace(/,?\s*Direct\s*$/i, ""));
    const stops = [from, ...intermediate, to].filter((stop, index, all) => index === 0 || operatorKey(stop) !== operatorKey(all[index - 1]));
    if (stops.length >= 2) records.push({ operator: cleanOperator(current.operator), routeName: `${from} ↔ ${to}`, routeStops: stops, source });
  };

  for (const value of strings) {
    const heading = value.match(/^(.+?)\s*\(\s*(?:From\s+)?(.+?)\s+to\s+(.+?)\s*\)$/i);
    if (heading) {
      finish();
      current = { operator: heading[1], from: heading[2], to: heading[3], lines: [] };
    } else if (current) {
      if (/^City Service Bus List/i.test(value)) continue;
      if (/^(?:\|m|phfff|vgvg|gdzs!)/i.test(value)) { finish(); current = null; continue; }
      current.lines.push(value);
    }
  }
  finish();
  return records.filter((record) => record.operator && record.routeStops.length >= 2);
}

function dedupeVariants(records: RouteVariant[]) {
  const companies = new Map<string, { name: string; variants: RouteVariant[] }>();
  for (const record of records) {
    const key = operatorKey(record.operator);
    if (!key) continue;
    const company = companies.get(key) || { name: record.operator, variants: [] };
    const signature = record.routeStops.map((stop) => operatorKey(stop)).join("|");
    if (!company.variants.some((variant) => variant.routeStops.map((stop) => operatorKey(stop)).join("|") === signature)) company.variants.push(record);
    if (record.operator.length > company.name.length && record.operator.length < 50) company.name = record.operator;
    companies.set(key, company);
  }
  return companies;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const paths = args.filter((arg) => !arg.startsWith("--"));
  if (paths.length < 2) throw new Error("Usage: tsx scripts/import-document-routes.ts <routes.txt> <legacy.doc> [routes.pdf] [--dry-run]");
  const [textPath, docPath, pdfPath] = paths;
  const [text, doc] = await Promise.all([readFile(textPath, "utf8"), readFile(docPath)]);
  const pdfResult = parsePdfText(text, basename(pdfPath || textPath));
  const pdfRecords = pdfResult.records;
  const docRecords = parseLegacyDoc(doc, basename(docPath));
  const companies = dedupeVariants([...pdfRecords, ...docRecords]);
  const suspicious = [...companies.values()].flatMap((company) => company.variants)
    .filter((variant) => variant.routeStops.length < 3 || variant.routeStops.some((stop) => ROUTE_NOISE.test(stop) || stop.length > 80))
    .slice(0, 20)
    .map((variant) => ({ operator: variant.operator, routeName: variant.routeName, stops: variant.routeStops.length }));

  console.log(JSON.stringify({ pdfRecords: pdfRecords.length, pdfFailed: pdfResult.failed, legacyRecords: docRecords.length, companies: companies.size, routeVariants: [...companies.values()].reduce((sum, company) => sum + company.variants.length, 0), suspicious }, null, 2));
  if (dryRun) return;

  const [{ connectDB }, { Transport }, { slugify }] = await Promise.all([
    import("../lib/db"), import("../models/Transport"), import("../lib/utils"),
  ]);
  await connectDB();
  const existingDocuments = await Transport.find({}).lean() as unknown as ExistingTransport[];
  const backupPath = resolve(".tmp", `transport-backup-before-document-import-${Date.now()}.json`);
  await writeFile(backupPath, JSON.stringify(existingDocuments, null, 2), "utf8");
  const existing = existingDocuments.map((item) => ({ _id: item._id, name: item.name, slug: item.slug, imageUrl: item.imageUrl, color: item.color, dataStatus: item.dataStatus }));
  const existingByKey = new Map<string, ExistingTransport>(existing.map((item) => [operatorKey(item.name), item]));
  const existingByRoute = new Map<string, ExistingTransport>(existingDocuments.flatMap((item) => (item.routeVariants || []).slice(0, 1).map((variant) => [variant.routeStops.map((stop) => operatorKey(stop)).join("|"), item] as [string, ExistingTransport])));
  const importedAt = new Date();
  const processedIds: unknown[] = [];
  let inserted = 0;
  let updated = 0;

  for (const [key, company] of companies) {
    const primarySignature = company.variants[0].routeStops.map((stop) => operatorKey(stop)).join("|");
    const keyMatch = existingByKey.get(key);
    const match = keyMatch || existingByRoute.get(primarySignature);
    const routeStops = [...new Set(company.variants.flatMap((variant) => variant.routeStops))];
    const primary = company.variants[0];
    const importedName = CANONICAL_NAMES[key] || company.name;
    const update = {
      name: keyMatch && keyMatch.dataStatus !== "unverified_import" ? keyMatch.name : importedName,
      slug: keyMatch && keyMatch.dataStatus !== "unverified_import" ? keyMatch.slug : slugify(importedName),
      routeName: company.variants.length === 1 ? primary.routeName : `${primary.routeName} + ${company.variants.length - 1} more`,
      routeStops,
      routeVariants: company.variants.map((variant) => ({ routeName: variant.routeName, routeStops: variant.routeStops, source: variant.source })),
      sourceInfo: [textPath, docPath, pdfPath].filter(Boolean).map((filePath) => ({ fileName: basename(filePath!), importedAt })),
      dataStatus: "unverified_import",
    };
    if (match) {
      await Transport.updateOne({ _id: match._id }, { $set: update });
      processedIds.push(match._id);
      updated += 1;
    } else {
      const created = await Transport.create({ ...update, imageUrl: "", color: COLORS[(inserted + updated) % COLORS.length], active: true });
      processedIds.push(created._id);
      inserted += 1;
    }
  }
  const sourceNames = [textPath, docPath, pdfPath].filter(Boolean).map((filePath) => basename(filePath!));
  const cleanup = await Transport.deleteMany({ dataStatus: "unverified_import", "sourceInfo.fileName": { $in: sourceNames }, _id: { $nin: processedIds } });
  console.log(JSON.stringify({ inserted, updated, removedStaleImports: cleanup.deletedCount, totalCompanies: companies.size, backupPath }, null, 2));
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
