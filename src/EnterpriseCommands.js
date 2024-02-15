const { IpAllowListEntry } = require('./models/IpAllowListEntry');
const { Enterprise } = require('./models/Enterprise');

const core = require('@actions/core');

export async function GetEnterpriseScopedIpAllowListEntriesCommand({
  enterpriseSlug,
  octokit,
  scope,
}) {
  const enterprise = await GetEnterpriseCommand({
    enterpriseSlug,
    octokit,
  });
  const ipAllowListEntries = await GetIpAllowListEntriesCommand({
    enterpriseSlug,
    octokit,
  });

  core.startGroup('GetEnterpriseScopedIpAllowListEntriesCommand');
  core.debug(`enterprise: ${JSON.stringify(enterprise)}`);
  core.debug(`number of ipAllowListEntries: ${ipAllowListEntries.length}`);
  const scopedIpAllowListEntries = ipAllowListEntries.filter((IpAllowListEntry) =>
    IpAllowListEntry.name.startsWith(scope),
  );
  core.debug(
    `number of scopedIpAllowListEntries: ${scopedIpAllowListEntries.length}, scope: ${scope}`,
  );
  core.endGroup();

  return {
    enterprise,
    ipAllowListEntries: scopedIpAllowListEntries,
  };
}

export async function GetEnterpriseCommand({ enterpriseSlug, octokit }) {
  core.startGroup('GetEnterpriseCommand');
  const queryResult = await octokit.graphql({
    query: `
    query getEnterprise($enterpriseSlug: String!) {
      enterprise(slug: $enterpriseSlug) {
        databaseId
        name
        slug
        url,
        id,
      }
    }
    `,
    enterpriseSlug,
  });
  core.debug(`GetEnterpriseCommand ${JSON.stringify(queryResult)}`);
  core.endGroup();
  return new Enterprise(queryResult.enterprise);
}

export async function GetIpAllowListEntriesCommand({ enterpriseSlug, octokit }) {
  const ipAllowListEntries = [];
  const queryParameters = {
    query: `
    query getEnterprise($enterpriseSlug: String!, $cursor: String) {
      enterprise(slug: $enterpriseSlug) {
        databaseId
        name
        slug
        url,
        id,
        ownerInfo {
          ipAllowListEntries(first: 100 after: $cursor) {
            pageInfo {
              endCursor
              hasNextPage
            }
            totalCount
            nodes {
              id
              name
              createdAt
              updatedAt
              isActive
              allowListValue
            }
          }
        }
      }
    }
    `,
    enterpriseSlug,
  };

  let hasNextPage = false;
  do {
    const queryResult = await octokit.graphql(queryParameters);

    const ipEntries = getObject(
      queryResult,
      'enterprise',
      'ownerInfo',
      'ipAllowListEntries',
      'nodes',
    );
    if (ipEntries) {
      ipAllowListEntries.push(...ipEntries.map((data) => new IpAllowListEntry(data)));
    }

    const pageInfo = getObject(
      queryResult,
      'enterprise',
      'ownerInfo',
      'ipAllowListEntries',
      'pageInfo',
    );
    hasNextPage = pageInfo ? pageInfo.hasNextPage : false;
    if (hasNextPage) {
      queryParameters.cursor = pageInfo.endCursor;
    }
  } while (hasNextPage);

  return ipAllowListEntries;
}

function getObject(target, ...path) {
  if (target !== null && target !== undefined) {
    const value = target[path[0]];

    if (path.length > 1) {
      return getObject(value, ...path.slice(1));
    } else {
      return value;
    }
  }
  return null;
}

export async function CreateIpAllowListEntryCommand({ octokit, ownerId, cidrEntry }) {
  const { name, cidr, isActive } = cidrEntry;
  core.startGroup(`CreateIpAllowListEntryCommand ${cidr}`);
  core.info(`parameters`);
  core.info(`  owner:  ${ownerId}`);
  core.info(`   name:  ${name}`);
  core.info(`   cidr:  ${cidr}`);
  core.info(` active:  ${!!isActive}`);

  const createdIpAllowList = await octokit.graphql({
    query: `
      mutation createIpAllowListEntry($owner: ID!, $cidr: String!, $name: String!, $isActive: Boolean!) {
        createIpAllowListEntry(input: {
          allowListValue: $cidr,
          isActive: $isActive,
          name: $name,
          ownerId: $owner
        }) {
          clientMutationId
          ipAllowListEntry {
            id
            allowListValue
            createdAt
            updatedAt
            isActive
            name
          }
        }
      }
    `,
    owner: ownerId,
    name,
    cidr,
    isActive,
  });
  core.info(`result ${JSON.stringify(createdIpAllowList)}`);
  core.endGroup();
  return new IpAllowListEntry(createdIpAllowList);
}

export async function UpdateIpAllowListEntryCommand({ octokit, ipAllowListEntry }) {
  const { id, name, cidr, allowListValue, isActive } = ipAllowListEntry;
  core.startGroup(`UpdateIpAllowListEntryCommand ${cidr}`);
  core.info(`parameters`);
  core.info(`     id:  ${id}`);
  core.info(`   name:  ${name}`);
  core.info(`   cidr:  ${cidr}`);
  core.info(` isActive:  ${isActive}`);

  const updatedIpAllowList = await octokit.graphql({
    query: `
      mutation updateIpAllowListEntry($id: ID!, $cidr: String!, $name: String!, $isActive: Boolean!) {
        updateIpAllowListEntry(input: {
          allowListValue: $cidr,
          isActive: $isActive,
          name: $name,
          ipAllowListEntryId: $id
        }) {
          clientMutationId
          ipAllowListEntry {
            id
            allowListValue
            createdAt
            updatedAt
            isActive
            name
          }
        }
      }
    `,
    id,
    name,
    cidr,
    isActive,
  });
  core.info(`result ${JSON.stringify(updatedIpAllowList)}`);
  core.endGroup();
  return new IpAllowListEntry(updatedIpAllowList);
}

export async function DeleteIpAllowListEntryCommand({ octokit, ipAllowListEntry }) {
  const { id, cidr, name } = ipAllowListEntry;
  core.startGroup(`DeleteIpAllowListEntryCommand ${cidr}`);
  core.info(`parameters`);
  core.info(`  id:   ${id}`);
  core.info(`  name: ${name}`);

  const deletedIpAllowList = await octokit.graphql({
    query: `
      mutation deleteIpAllowListEntry($id: ID!) {
        deleteIpAllowListEntry(input: {
          ipAllowListEntryId: $id
        }) {
          clientMutationId
          ipAllowListEntry {
            id
            allowListValue
            createdAt
            updatedAt
            isActive
            name
          }
        }
      }
    `,
    id,
  });
  core.info(`result ${JSON.stringify(deletedIpAllowList)}`);
  core.endGroup();
  return new IpAllowListEntry(deletedIpAllowList);
}
