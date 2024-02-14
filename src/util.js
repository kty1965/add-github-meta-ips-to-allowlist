const core = require("@actions/core");
const YAML = require("yaml");
const { CidrEntry } = require("./CidrEntry");
const { Octokit } = require("@octokit/rest");

async function getMetaCIDRs({ metadataKey }) {
  const octokitRest = new Octokit();
  const { data: metadata } = await octokitRest.rest.meta.get();
  core.info(`metadataKey: ${metadataKey}`);
  core.info(
    `Get https://api.github.com/meta GitHub Meta API CIDRs, ${JSON.stringify(
      metadata[metadataKey]
    )}`
  );
  return metadata[metadataKey];
}

export async function getMetaCidrEntries({ metadataKey }) {
  const cidrs = await getMetaCIDRs({ metadataKey });
  const cidrEntries = cidrs.map(
    (cidr) =>
      new CidrEntry({
        name: "@scope made by github action",
        cidr,
        isActive: true,
      })
  );
  core.debug(`getMetaCidrEntries: ${JSON.stringify(cidrEntries)}`);
  return cidrEntries;
}

export function getAdditionalCidrEntries(value) {
  let cidrEntries;
  try {
    const parsedCidrEntries = YAML.parse(value);
    core.debug(`yaml parse: ${JSON.stringify(parsedCidrEntries)}`);
    cidrEntries = parsedCidrEntries.map(
      (cidrEntry) => new CidrEntry(cidrEntry)
    );
    core.debug(`getAdditionalCidrEntries: ${JSON.stringify(cidrEntries)}`);
  } catch (err) {
    throw new Error(`additionalCidrEntries yaml string cannot parse ${err}`);
  }
  return cidrEntries;
}

export function getToDeleteIpAllowListEntries({
  existScopedIpAllowListEntries,
  expectCidrEntries,
}) {
  // find set existScopedIpAllowListEntries - expectCidrEntries
  const expectCidrs = expectCidrEntries.map((cidrEntry) => cidrEntry.cidr);
  const toDeleteIpAllowListEntries = existScopedIpAllowListEntries.filter(
    (scoped) => {
      expectCidrs.indexOf(scoped.cidr) === -1; // find only exist in existScopedIpAllowListEntries
    }
  );
  return toDeleteIpAllowListEntries;
}

export function getToCreateIpAllowListEntries({
  existScopedIpAllowListEntries,
  expectCidrEntries,
}) {
  // find set expectCidrEntries -   existScopedIpAllowListEntries
  const existCidrs = existScopedIpAllowListEntries.map(
    (ipAllowListEntry) => ipAllowListEntry.cidr
  );
  const toCreateIpAllowListEntries = expectCidrEntries.filter((expect) => {
    existCidrs.indexOf(expect.cidr) === -1; // find only exist in   expectCidrEntries
  });
  return toCreateIpAllowListEntries;
}

export function getToUpdateIpAllowListEntries({
  existScopedIpAllowListEntries,
  expectCidrEntries,
}) {
  const expectCidrs = expectCidrEntries.map((cidrEntry) => cidrEntry.cidr);
  const candidateToUpdateIpAllowListEntries =
    existScopedIpAllowListEntries.filter((scoped) => {
      expectCidrs.indexOf(scoped.cidr) > -1; // find only two sections
    });

  const toUpdateIpAllowListEntries = candidateToUpdateIpAllowListEntries.filter(
    (candidateToUpdateIpAllowListEntry) => {
      // TODO extract need to update entries
      return true;
    }
  );
  return toUpdateIpAllowListEntries;
}
