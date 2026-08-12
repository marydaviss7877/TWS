import { readFile, writeFile } from "node:fs/promises";

const sourcePath = "/tmp/ny_dentists_test.json";
const jsonOutput = new URL("./new_york_dentists_complete.json", import.meta.url);
const csvOutput = new URL("./new_york_dentists_500.csv", import.meta.url);

const records = JSON.parse(await readFile(sourcePath, "utf8"));

if (!Array.isArray(records) || records.length !== 500) {
  throw new Error(`Expected 500 dentist records, received ${records.length}`);
}

const quote = (value) => {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

const headers = [
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
  "version",
  "source_datasets",
  "source_licenses",
  "source_update_times",
];

const rows = records.map((record) => {
  const properties = record.properties ?? {};
  const address = properties.addresses?.[0] ?? {};
  const sources = properties.sources ?? [];

  return [
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
    properties.version,
    [...new Set(sources.map((source) => source.dataset).filter(Boolean))].join(" | "),
    [...new Set(sources.map((source) => source.license).filter(Boolean))].join(" | "),
    sources.map((source) => source.update_time).filter(Boolean).join(" | "),
  ];
});

const csv = [
  headers.map(quote).join(","),
  ...rows.map((row) => row.map(quote).join(",")),
].join("\n");

await writeFile(jsonOutput, `${JSON.stringify(records, null, 2)}\n`);
await writeFile(csvOutput, `${csv}\n`);

const uniqueIds = new Set(records.map((record) => record.id));
const withPhones = records.filter((record) => record.properties?.phones?.length).length;
const withEmails = records.filter((record) => record.properties?.emails?.length).length;
const withWebsites = records.filter((record) => record.properties?.websites?.length).length;
const withAddresses = records.filter(
  (record) => record.properties?.addresses?.[0]?.freeform,
).length;

console.log(
  JSON.stringify(
    {
      records: records.length,
      uniqueIds: uniqueIds.size,
      withPhones,
      withEmails,
      withWebsites,
      withAddresses,
    },
    null,
    2,
  ),
);
