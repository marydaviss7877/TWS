import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API_URL = "https://api.overturemapsapi.com/places";
const API_KEY = process.env.OVERTURE_API_KEY;
const TARGET_PER_STATE = 500;
const PAGE_SIZE = 5000;
const OUTPUT_DIR = path.resolve("usa_dentists_by_state");

if (!API_KEY) {
  throw new Error("Set OVERTURE_API_KEY before running this script.");
}

const states = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const buckets = Object.fromEntries(
  Object.keys(states).map((code) => [code, new Map()]),
);

const normalizeRegion = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toUpperCase();
  const code = normalized.startsWith("US-") ? normalized.slice(3) : normalized;
  if (states[code]) return code;
  return (
    Object.entries(states).find(
      ([, name]) => name.toUpperCase() === normalized,
    )?.[0] ?? null
  );
};

const getStateCode = (record) => {
  for (const address of record.properties?.addresses ?? []) {
    if (String(address.country ?? "").toUpperCase() !== "US") continue;
    const code = normalizeRegion(address.region);
    if (code) return code;
  }
  return null;
};

const quote = (value) => {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

const headers = [
  "state_code",
  "state",
  "id",
  "name",
  "longitude",
  "latitude",
  "primary_category",
  "alternate_categories",
  "address",
  "locality",
  "postcode",
  "region",
  "country",
  "phones",
  "emails",
  "websites",
  "socials",
  "brand",
  "confidence",
  "operating_status",
  "version",
  "source_datasets",
  "source_licenses",
  "source_update_times",
];

const toRow = (record, stateCode) => {
  const properties = record.properties ?? {};
  const address =
    (properties.addresses ?? []).find(
      (item) => normalizeRegion(item.region) === stateCode,
    ) ??
    properties.addresses?.[0] ??
    {};
  const sources = properties.sources ?? [];

  return [
    stateCode,
    states[stateCode],
    record.id,
    properties.names?.primary ?? properties.ext_name,
    record.geometry?.coordinates?.[0],
    record.geometry?.coordinates?.[1],
    properties.categories?.primary,
    (properties.categories?.alternate ?? []).join(" | "),
    address.freeform,
    address.locality,
    address.postcode,
    address.region,
    address.country,
    (properties.phones ?? []).join(" | "),
    (properties.emails ?? []).join(" | "),
    (properties.websites ?? []).join(" | "),
    (properties.socials ?? []).join(" | "),
    properties.brand?.names?.primary,
    properties.confidence,
    properties.operating_status,
    properties.version,
    [...new Set(sources.map((source) => source.dataset).filter(Boolean))].join(
      " | ",
    ),
    [...new Set(sources.map((source) => source.license).filter(Boolean))].join(
      " | ",
    ),
    sources.map((source) => source.update_time).filter(Boolean).join(" | "),
  ];
};

const toCsv = (records, stateCode) =>
  [
    headers.map(quote).join(","),
    ...records.map((record) =>
      toRow(record, stateCode).map(quote).join(","),
    ),
  ].join("\n") + "\n";

const allStatesComplete = () =>
  Object.values(buckets).every((bucket) => bucket.size >= TARGET_PER_STATE);

await mkdir(OUTPUT_DIR, { recursive: true });

let page = 0;
let totalResults = null;
let pagesFetched = 0;
let recordsScanned = 0;
let unmatchedRegionRecords = 0;

while (!allStatesComplete()) {
  const url = new URL(API_URL);
  url.searchParams.set("country", "US");
  url.searchParams.set("categories", "dentist");
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("page", String(page));

  let response;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    response = await fetch(url, {
      headers: { "x-api-key": API_KEY },
    });
    if (response.ok || response.status < 500) break;
    console.log(`Page ${page}: HTTP ${response.status}; retry ${attempt}/3`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }

  if (!response.ok) {
    throw new Error(
      `Page ${page} failed with HTTP ${response.status}: ${await response.text()}`,
    );
  }

  const records = await response.json();
  totalResults = Number(response.headers.get("pagination-count")) || totalResults;
  pagesFetched += 1;
  recordsScanned += records.length;

  for (const record of records) {
    const stateCode = getStateCode(record);
    if (!stateCode) {
      unmatchedRegionRecords += 1;
      continue;
    }

    const bucket = buckets[stateCode];
    if (bucket.size < TARGET_PER_STATE) {
      bucket.set(record.id, record);
    }
  }

  const completed = Object.values(buckets).filter(
    (bucket) => bucket.size >= TARGET_PER_STATE,
  ).length;
  console.log(
    `Page ${page}: scanned ${records.length}; ${completed}/50 states complete`,
  );

  page += 1;
  if (records.length < PAGE_SIZE) break;
  if (totalResults != null && page * PAGE_SIZE >= totalResults) break;
}

const combinedRows = [];
const summary = [];

for (const [stateCode, stateName] of Object.entries(states)) {
  const records = [...buckets[stateCode].values()].slice(0, TARGET_PER_STATE);
  const baseName = `${stateCode}_${stateName.toLowerCase().replaceAll(" ", "_")}_dentists`;

  await writeFile(
    path.join(OUTPUT_DIR, `${baseName}.json`),
    `${JSON.stringify(records, null, 2)}\n`,
  );
  await writeFile(
    path.join(OUTPUT_DIR, `${baseName}.csv`),
    toCsv(records, stateCode),
  );

  combinedRows.push(
    ...records.map((record) => toRow(record, stateCode).map(quote).join(",")),
  );
  summary.push({
    state_code: stateCode,
    state: stateName,
    records: records.length,
    target: TARGET_PER_STATE,
    complete: records.length === TARGET_PER_STATE,
  });
}

await writeFile(
  path.join(OUTPUT_DIR, "all_states_dentists.csv"),
  `${headers.map(quote).join(",")}\n${combinedRows.join("\n")}\n`,
);
await writeFile(
  path.join(OUTPUT_DIR, "summary.json"),
  `${JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      category: "dentist",
      country: "US",
      target_per_state: TARGET_PER_STATE,
      total_api_results: totalResults,
      pages_fetched: pagesFetched,
      records_scanned: recordsScanned,
      unmatched_region_records: unmatchedRegionRecords,
      total_records_stored: summary.reduce(
        (total, state) => total + state.records,
        0,
      ),
      states: summary,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `Stored ${summary.reduce((total, state) => total + state.records, 0)} records in ${OUTPUT_DIR}`,
);
