const core = require('@actions/core');
const YAML = require('yaml');
const { CidrEntry } = require('./models/CidrEntry');
const Bottleneck = require('bottleneck');
const { Octokit } = require('@octokit/rest');
const _ = require('underscore');
const { env } = require('./env');

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

export async function getMetaCidrEntries({ metadataKey, scope }) {
  const cidrs = await getMetaCIDRs({ metadataKey });
  const cidrEntries = cidrs.map(
    (cidr) =>
      new CidrEntry({
        name: `${scope} made by github action`,
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
  core.startGroup('getToDeleteIpAllowListEntries');
  // find set existScopedIpAllowListEntries - expectCidrEntries
  const groupByCidrOnExpectCidrEntries = _.groupBy(expectCidrEntries, 'cidr');
  const groupByCidrOnExistScopedIpAllowListEntries = _.groupBy(
    existScopedIpAllowListEntries,
    'cidr',
  );
  core.debug(`groupByCidrOnExpectCidrEntries: ${JSON.stringify(groupByCidrOnExpectCidrEntries)}`);
  core.debug(
    `groupByCidrOnExistScopedIpAllowListEntries: ${JSON.stringify(
      groupByCidrOnExistScopedIpAllowListEntries,
    )}`,
  );

  const toDeleteCidrs = _.difference(
    _.keys(groupByCidrOnExistScopedIpAllowListEntries),
    _.keys(groupByCidrOnExpectCidrEntries),
  );
  core.debug(`toDeleteCidrs: ${JSON.stringify(toDeleteCidrs)}`);
  core.endGroup();

  const toDeleteIpAllowListEntries = toDeleteCidrs.map((cidr) => {
    return groupByCidrOnExistScopedIpAllowListEntries[cidr][0];
  });

  return toDeleteIpAllowListEntries;
}

export function getToCreateIpAllowListEntries({
  existScopedIpAllowListEntries,
  expectCidrEntries,
}) {
  core.startGroup('getToCreateIpAllowListEntries');
  // find set expectCidrEntries -   existScopedIpAllowListEntries
  const groupByCidrOnExpectCidrEntries = _.groupBy(expectCidrEntries, 'cidr');
  const groupByCidrOnExistScopedIpAllowListEntries = _.groupBy(
    existScopedIpAllowListEntries,
    'cidr',
  );

  core.debug(`groupByCidrOnExpectCidrEntries: ${JSON.stringify(groupByCidrOnExpectCidrEntries)}`);
  core.debug(
    `groupByCidrOnExistScopedIpAllowListEntries: ${JSON.stringify(
      groupByCidrOnExistScopedIpAllowListEntries,
    )}`,
  );

  const toCreateCidrs = _.difference(
    _.keys(groupByCidrOnExpectCidrEntries),
    _.keys(groupByCidrOnExistScopedIpAllowListEntries),
  );
  core.debug(`toCreateCidrs: ${JSON.stringify(toCreateCidrs)}`);
  core.endGroup();

  const toCreateIpAllowListEntries = toCreateCidrs.map((cidr) => {
    return groupByCidrOnExpectCidrEntries[cidr][0];
  });
  return toCreateIpAllowListEntries;
}

export function getToUpdateIpAllowListEntries({
  existScopedIpAllowListEntries,
  expectCidrEntries,
}) {
  core.startGroup('getToUpdateIpAllowListEntries');
  const groupByCidrOnExpectCidrEntries = _.groupBy(expectCidrEntries, 'cidr');
  const groupByCidrOnExistScopedIpAllowListEntries = _.groupBy(
    existScopedIpAllowListEntries,
    'cidr',
  );

  core.debug(`groupByCidrOnExpectCidrEntries: ${JSON.stringify(groupByCidrOnExpectCidrEntries)}`);
  core.debug(
    `groupByCidrOnExistScopedIpAllowListEntries: ${JSON.stringify(
      groupByCidrOnExistScopedIpAllowListEntries,
    )}`,
  );

  const toUpdateTupleCidrEntryWithIpAllowListEntry = _.intersection(
    _.keys(groupByCidrOnExpectCidrEntries),
    _.keys(groupByCidrOnExistScopedIpAllowListEntries),
  )
    .map((cidr) => {
      return [
        groupByCidrOnExpectCidrEntries[cidr][0],
        groupByCidrOnExistScopedIpAllowListEntries[cidr][0],
      ];
    })
    .filter(([cidrEntry, ipAllowListEntry]) => {
      return (
        cidrEntry.name != ipAllowListEntry.name || cidrEntry.isActive != ipAllowListEntry.isActive
      );
    });

  core.debug(
    `toUpdateTupleCidrEntryWithIpAllowListEntry: ${JSON.stringify(
      toUpdateTupleCidrEntryWithIpAllowListEntry,
    )}`,
  );
  core.endGroup();

  return toUpdateTupleCidrEntryWithIpAllowListEntry;
}

export async function createIpAllowListEntries({ enterprise, cidrEntries, octokit }) {
  const taskScheduler = new Bottleneck({ maxConcurrent: env.api.concurrency });
  const ownerId = enterprise.id;
  const promises = cidrEntries.map((cidrEntry) => {
    return taskScheduler.schedule(() =>
      CreateIpAllowListEntryCommand({ octokit, ownerId, cidrEntry }),
    );
  });

  return await Promise.all(promises);
}

export async function updateIpAllowListEntries({ ipAllowListEntries, octokit }) {
  const taskScheduler = new Bottleneck({ maxConcurrent: env.api.concurrency });
  const promises = ipAllowListEntries.map((ipAllowListEntry) => {
    return taskScheduler.schedule(() =>
      UpdateIpAllowListEntryCommand({ octokit, ipAllowListEntry }),
    );
  });

  return await Promise.all(promises);
}

export async function deleteIpAllowListEntries({ ipAllowListEntries, octokit }) {
  const taskScheduler = new Bottleneck({ maxConcurrent: env.api.concurrency });
  const promises = ipAllowListEntries.map((ipAllowListEntry) => {
    return taskScheduler.schedule(() =>
      DeleteIpAllowListEntryCommand({ octokit, ownerId, ipAllowListEntry }),
    );
  });

  return await Promise.all(promises);
}
