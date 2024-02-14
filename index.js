const YAML = require("yaml");
const core = require("@actions/core");

const { CreateGithubClient } = require("./src/GithubClient");

const {
  GetEnterpriseScopedIpAllowListEntriesCommand,
} = require("./src/EnterpriseCommands");

const {
  getMetaCidrEntries,
  getAdditionalCidrEntries,
  getToDeleteIpAllowListEntries,
  getToCreateIpAllowListEntries,
} = require("./src/util");

const expectCidrEntries = [];

async function run() {
  try {
    const githubToken = core.getInput("github_token", { required: true });
    const enterpriseSlug = core.getInput("enterprise_slug", { required: true });
    const metadataKey = core.getInput("metadata_key");
    const additionalCidrEntries = core.getInput("additional_cidr_entries");
    const scope = core.getInput("scope");

    const octokit = CreateGithubClient(githubToken);

    if (!metadataKey && !additionalCidrEntries) {
      throw new Error(
        "A set of additionalCidrEntries or GitHub metadataKey must be specified."
      );
    }

    const { enterprise, ipAllowListEntries: existScopedIpAllowListEntries } =
      await GetEnterpriseScopedIpAllowListEntriesCommand({
        enterpriseSlug,
        octokit,
        scope,
      });

    if (metadataKey) {
      const cidrEntries = await getMetaCidrEntries({ metadataKey });
      if (cidrEntries) {
        expectCidrEntries.push(cidrEntries);
      } else {
        throw new Error(
          `The metadata cidrEntries for '${metadataKey}' were unable to be resolved.`
        );
      }
    }
    if (additionalCidrEntries) {
      const cidrEntries = getAdditionalCidrEntries(additionalCidrEntries);
      expectCidrEntries.push(cidrEntries);
    }

    const toDelete = getToCreateIpAllowListEntries({
      existScopedIpAllowListEntries,
      expectCidrEntries,
    });
    core.info(`toDelete: ${JSON.stringify(toDelete)}`);

    const toCreate = getToDeleteIpAllowListEntries({
      existScopedIpAllowListEntries,
      expectCidrEntries,
    });
    core.info(`toCreate: ${JSON.stringify(toCreate)}`);

    const toUpdate = getToUpdateIpAllowListEntries({
      existScopedIpAllowListEntries,
      expectCidrEntries,
    });
    core.info(`toUpdate: ${JSON.stringify(toUpdate)}`);
  } catch (err) {
    core.setFailed(err);
  }
}

run();
