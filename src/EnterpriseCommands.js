const { IpAllowListEntry } = require('./models/IpAllowListEntry');

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

  core.debug(`enterprise: ${JSON.stringify(enterprise)}`);
  core.debug(`ipAllowListEntries last(10): ${JSON.stringify(ipAllowListEntries.slice(-10))}`);
  const scopedIpAllowListEntries = ipAllowListEntries.filter((IpAllowListEntry) =>
    IpAllowListEntry.name.startsWith(scope),
  );
  core.debug(
    `scopedIpAllowListEntries last(10): ${JSON.stringify(
      scopedIpAllowListEntries.slice(-10),
    )}, scope: ${scope}`,
  );

  return {
    enterprise,
    ipAllowListEntries: scopedIpAllowListEntries,
  };
}

export async function GetEnterpriseCommand({ enterpriseSlug, octokit }) {
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
  core.startGroup(`create cidr: ${cidr}`);
  core.info(`parameters`);
  core.info(`  owner:  ${ownerId}`);
  core.info(`   name:  ${name}`);
  core.info(`   cidr:  ${cidr}`);
  core.info(` active:  ${!!isActive}`);
  core.endGroup();

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
    name: name,
    cidr: cidr,
    isActive: !!isActive,
  });
  return new IpAllowListEntry(createdIpAllowList);
}

export async function UpdateIpAllowListEntryCommand({ octokit, ipAllowListEntry }) {
  // const { name, cidr, isActive } = cidrEntry;
  // const { id } = ipAllowListEntry;
  // core.startGroup(`create cidr: ${cidr}`);
  // core.info(`parameters`);
  // core.info(`     id:  ${id}`);
  // core.info(`   name:  ${name}`);
  // core.info(`   cidr:  ${cidr}`);
  // core.info(` active:  ${!!isActive}`);
  // core.endGroup();

  // const updatedIpAllowList = await octokit.graphql({
  //   query: `
  //     mutation updateIpAllowListEntry($id: ID!, $cidr: String!, $name: String!, $isActive: Boolean!) {
  //       updateIpAllowListEntry(input: {
  //         allowListValue: $cidr,
  //         isActive: $isActive,
  //         name: $name,
  //         ipAllowListEntryId: $id
  //       }) {
  //         clientMutationId
  //         ipAllowListEntry {
  //           id
  //           allowListValue
  //           createdAt
  //           updatedAt
  //           isActive
  //           name
  //         }
  //       }
  //     }
  //   `,
  //   ipAllowListEntryId: id,
  //   name: name,
  //   cidr: cidr,
  //   isActive: !!isActive,
  // });
  return new IpAllowListEntry(updatedIpAllowList);
}

export async function DeleteIpAllowListEntryCommand({ octokit, ipAllowListEntry }) {
  const { id, cidr, name } = ipAllowListEntry;
  core.startGroup(`delete cidr: ${cidr}`);
  core.info(`parameters`);
  core.info(`  id:   ${id}`);
  core.info(`  name: ${name}`);
  core.endGroup();

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
  return new IpAllowListEntry(deletedIpAllowList);
}
