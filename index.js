const core = require('@actions/core');

const { CreateGithubClient } = require('./src/GithubClient');

const { GetEnterpriseScopedIpAllowListEntriesCommand } = require('./src/EnterpriseCommands');

const {
  getMetaCidrEntries,
  getAdditionalCidrEntries,
  getToDeleteIpAllowListEntries,
  getToCreateIpAllowListEntries,
  getToUpdateIpAllowListEntries,
  createIpAllowListEntries,
  deleteIpAllowListEntries,
  updateIpAllowListEntries,
} = require('./src/util');
const { IpAllowListEntry } = require('./src/models/IpAllowListEntry');

const expectCidrEntries = [];

async function run() {
  try {
    const githubToken = core.getInput('github_token', { required: true });
    const enterpriseSlug = core.getInput('enterprise_slug', { required: true });
    const metadataKey = core.getInput('metadata_key');
    const additionalCidrEntries = core.getInput('additional_cidr_entries');
    const scope = core.getInput('scope');
    const mode = core.getInput('mode');

    const octokit = CreateGithubClient(githubToken);

    if (!metadataKey && !additionalCidrEntries) {
      throw new Error('A set of additionalCidrEntries or GitHub metadataKey must be specified.');
    }

    const { enterprise, ipAllowListEntries: existScopedIpAllowListEntries } =
      await GetEnterpriseScopedIpAllowListEntriesCommand({
        enterpriseSlug,
        octokit,
        scope,
      });

    if (metadataKey) {
      const cidrEntries = await getMetaCidrEntries({ metadataKey, scope });
      if (cidrEntries) {
        expectCidrEntries.push(...cidrEntries);
      } else {
        throw new Error(
          `The metadata cidrEntries for '${metadataKey}' were unable to be resolved.`,
        );
      }
    }
    if (additionalCidrEntries) {
      const cidrEntries = getAdditionalCidrEntries(additionalCidrEntries);
      expectCidrEntries.push(...cidrEntries);
    }

    core.info(`number of existScopedIpAllowListEntries: ${existScopedIpAllowListEntries.length}`);
    core.info(`number of expectCidrEntries: ${expectCidrEntries.length}`);

    core.startGroup(`Delete IpAllowListEntries`);
    const toDelete = getToDeleteIpAllowListEntries({
      existScopedIpAllowListEntries,
      expectCidrEntries,
    });
    const toDeleteResult = await deleteIpAllowListEntries({
      ipAllowListEntries: toDelete,
      octokit,
    });
    core.info(`number of toDelete: ${toDelete.length}`);
    core.info(`number of toDeleteResult: ${toDeleteResult.length}`);
    core.endGroup();

    core.startGroup(`Create IpAllowListEntries`);
    const toCreate = getToCreateIpAllowListEntries({
      existScopedIpAllowListEntries,
      expectCidrEntries,
    });
    const toCreateResult = await createIpAllowListEntries({
      enterprise,
      cidrEntries: toCreate,
      octokit,
    });
    core.info(`number of toCreate: ${toCreate.length}`);
    core.info(`number of toCreateResult: ${toCreateResult.length}`);
    core.endGroup();

    core.startGroup(`Update IpAllowListEntries`);
    const toUpdateMergedIpAllowListEntries = getToUpdateIpAllowListEntries({
      existScopedIpAllowListEntries,
      expectCidrEntries,
    }).map(([cidrEntry, ipAllowListEntry]) => {
      return new IpAllowListEntry({
        ...ipAllowListEntry.toDictionary(),
        name: cidrEntry.name,
        isActive: cidrEntry.isActive,
      });
    });
    const toUpdateResult = await updateIpAllowListEntries({
      ipAllowListEntries: toUpdateMergedIpAllowListEntries,
      octokit,
    });
    core.info(`number of toUpdate: ${toUpdateMergedIpAllowListEntries.length}`);
    core.info(`number of toUpdateResult: ${toUpdateResult.length}`);
    core.endGroup();
  } catch (err) {
    core.setFailed(err);
  }
}

run();
