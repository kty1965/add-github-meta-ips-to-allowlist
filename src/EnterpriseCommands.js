import { IpAllowListEntry } from "./ipAllowListEntry";

export async function GetEnterpriseScopedIpAllowListEntriesCommand({
  enterpriseSlug,
  octokit,
}) {
  const { enterprise, ipAllowListEntries } =
    await GetEnterpriseIpAllowListEntriesCommand({
      enterpriseSlug,
      octokit,
    });
  const scopedIpAllowListEntries = ipAllowListEntries.filter(
    (IpAllowListEntry) => IpAllowListEntry.name.startsWith("@scope")
  );

  return {
    enterprise,
    ipAllowListEntries: scopedIpAllowListEntries,
  };
}
export async function GetEnterpriseIpAllowListEntriesCommand({
  enterpriseSlug,
  octokit,
}) {
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

  let enterprise = undefined;

  let hasNextPage = false;
  do {
    const queryResult = await octokit.graphql(queryParameters);

    if (!enterprise) {
      enterprise = {
        databaseId: queryResult.enterprise.databaseId,
        name: queryResult.enterprise.name,
        url: queryResult.enterprise.url,
        id: queryResult.enterprise.id,
      };
    }

    const ipEntries = getObject(
      queryResult,
      "enterprise",
      "ownerInfo",
      "ipAllowListEntries",
      "nodes"
    );
    if (ipEntries) {
      ipAllowListEntries.push(
        ...ipEntries.map((data) => new IpAllowListEntry(data))
      );
    }

    const pageInfo = getObject(
      queryResult,
      "enterprise",
      "ownerInfo",
      "ipAllowListEntries",
      "pageInfo"
    );
    hasNextPage = pageInfo ? pageInfo.hasNextPage : false;
    if (hasNextPage) {
      queryParameters.cursor = pageInfo.endCursor;
    }
  } while (hasNextPage);

  return {
    enterprise,
    ipAllowListEntries,
  };
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

// export async function addAllowListCIDRs(name, cidrs, isActive) {
//   const promises = [];

//   cidrs.forEach(cidr => {
//       promises.push(this.addIpAllowList(name, cidr, isActive));
//   });

//   return await Promise.all(promises);
// }

// export async function addIpAllowList(name, cidr, isActive) {
//   const existing = await this.getEnterpriseIpAllowListEntries();
//   const existingCIDRs = existing.map(value => value.cidr);
//   const matchedIndex = existingCIDRs.indexOf(cidr);

//   if (matchedIndex > -1) {
//       return existing[matchedIndex];
//   } else  {
//       return await this._limiter.schedule(() => addIpAllowList(this.octokit, this.id, name, cidr, isActive));
//   }
// }}

// export async function addIpAllowList(octokit, id, name, cidr, isActive) {
//   core.startGroup(`Adding cidr: ${cidr}`);
//   core.info(`  parameters`);
//   core.info(`     owner:  ${id}`);
//   core.info(`     name:   ${name}`);
//   core.info(`     cidr:   ${cidr}`);
//   core.info(`     active: ${!!isActive}`);
//   core.endGroup();

//   const ipAllowList = await octokit.graphql({
//     query: `
//           mutation addAllowList($owner: ID!, $cidr: String!, $name: String!, $isActive: Boolean!) {
//               createIpAllowListEntry(input: {
//                   allowListValue: $cidr,
//                   isActive: $isActive,
//                   name: $name,
//                   ownerId: $owner
//               }) {
//                   clientMutationId
//                   ipAllowListEntry {
//                       allowListValue
//                       createdAt
//                       updatedAt
//                       isActive
//                       name
//                   }
//               }
//           }
//           `,
//     owner: id,
//     name: name,
//     cidr: cidr,
//     isActive: !!isActive,
//   });
//   return new IpAllowListEntry(ipAllowList);
// }
