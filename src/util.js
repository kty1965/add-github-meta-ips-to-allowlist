const core = require('@actions/core');
const YAML = require('yaml');
const { CidrEntry } = require('./models/CidrEntry');
const TaskScheduler = require('./TaskScheduler');
const { Octokit } = require('@octokit/rest');
const _ = require('underscore');

const {
  CreateIpAllowListEntryCommand,
  DeleteIpAllowListEntryCommand,
  UpdateIpAllowListEntryCommand,
} = require('./EnterpriseCommands');

async function getMetaCIDRs({ metadataKey }) {
  const octokitRest = new Octokit();
  const { data: metadata } = await octokitRest.rest.meta.get();
  core.debug(
    `Get https://api.github.com/meta GitHub Meta API CIDRs, ${JSON.stringify(
      metadata[metadataKey],
    )}`,
  );
  return metadata[metadataKey];
}

export async function getMetaCidrEntries({ metadataKey }) {
  const cidrs = await getMetaCIDRs({ metadataKey });
  const cidrEntries = cidrs.map(
    (cidr) =>
      new CidrEntry({
        name: '@scope made by github action',
        cidr,
        isActive: true,
      }),
  );
  core.debug(`getMetaCidrEntries: ${JSON.stringify(cidrEntries)}`);
  return cidrEntries;
}

export function getAdditionalCidrEntries(value) {
  let cidrEntries;
  try {
    const parsedCidrEntries = YAML.parse(value);
    core.debug(`yaml parse: ${JSON.stringify(parsedCidrEntries)}`);
    cidrEntries = parsedCidrEntries.map((cidrEntry) => new CidrEntry(cidrEntry));
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
  const groupByCidrOnExpectCidrEntries = _.groupBy(expectCidrEntries, 'cidr');
  const groupByCidrOnExistScopedIpAllowListEntries = _.groupBy(
    existScopedIpAllowListEntries,
    'cidr',
  );

  const toDeleteCidrs = _.difference(
    _.values(groupByCidrOnExistScopedIpAllowListEntries),
    _.values(groupByCidrOnExpectCidrEntries),
  );

  const toDeleteIpAllowListEntries = toDeleteCidrs.map((cidr) => {
    return groupByCidrOnExistScopedIpAllowListEntries[cidr];
  });

  return toDeleteIpAllowListEntries;
}

export function getToCreateIpAllowListEntries({
  existScopedIpAllowListEntries,
  expectCidrEntries,
}) {
  // find set expectCidrEntries -   existScopedIpAllowListEntries
  const groupByCidrOnExpectCidrEntries = _.groupBy(expectCidrEntries, 'cidr');
  const groupByCidrOnExistScopedIpAllowListEntries = _.groupBy(
    existScopedIpAllowListEntries,
    'cidr',
  );

  const toCreateCidrs = _.difference(
    _.values(groupByCidrOnExpectCidrEntries),
    _.values(groupByCidrOnExistScopedIpAllowListEntries),
  );

  const toCreateIpAllowListEntries = toCreateCidrs.map((cidr) => {
    return groupByCidrOnExpectCidrEntries[cidr];
  });
  return toCreateIpAllowListEntries;
}

export function getToUpdateIpAllowListEntries({
  existScopedIpAllowListEntries,
  expectCidrEntries,
}) {
  const groupByCidrOnExpectCidrEntries = _.groupBy(expectCidrEntries, 'cidr');
  const groupByCidrOnExistScopedIpAllowListEntries = _.groupBy(
    existScopedIpAllowListEntries,
    'cidr',
  );

  const toUpdateTupleCidrEntryWithIpAllowListEntry = _.intersection(
    _.values(groupByCidrOnExpectCidrEntries),
    _.values(groupByCidrOnExistScopedIpAllowListEntries),
  )
    .map((cidr) => {
      return [
        groupByCidrOnExpectCidrEntries[cidr],
        groupByCidrOnExistScopedIpAllowListEntries[cidr],
      ];
    })
    .filter(([cidrEntry, ipAllowListEntry]) => {
      return (
        cidrEntry.name != ipAllowListEntry.name || cidrEntry.isActive != ipAllowListEntry.isActive
      );
    });

  return toUpdateTupleCidrEntryWithIpAllowListEntry;
}

export async function createIpAllowListEntries({ enterprise, cidrEntries, octokit }) {
  const ownerId = enterprise.id;
  const promises = cidrEntries.map((cidrEntry) => {
    return TaskScheduler.schedule(() =>
      CreateIpAllowListEntryCommand({ octokit, ownerId, cidrEntry }),
    );
  });

  return await Promise.all(promises);
}

export async function updateIpAllowListEntries({ ipAllowListEntries, octokit }) {
  const promises = ipAllowListEntries.map((ipAllowListEntry) => {
    return TaskScheduler.schedule(() =>
      UpdateIpAllowListEntryCommand({ octokit, ipAllowListEntry }),
    );
  });

  return await Promise.all(promises);
}

export async function deleteIpAllowListEntries({ ipAllowListEntries, octokit }) {
  const promises = ipAllowListEntries.map((ipAllowListEntry) => {
    return TaskScheduler.schedule(() =>
      DeleteIpAllowListEntryCommand({ octokit, ownerId, ipAllowListEntry }),
    );
  });

  return await Promise.all(promises);
}
