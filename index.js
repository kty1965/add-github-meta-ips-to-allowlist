import YAML from "yaml";
import core from "@actions/core";

import { CreateGithubClient } from "./src/github";
import { CidrEntry } from "./src/cidrEntry";

async function run() {
  try {
    const githubToken = core.getInput("github_token", { required: true });
    const enterpriseSlug = core.getInput("enterprise_slug", { required: true });
    const metadataKey = core.getInput("metadata_key");
    const additionalCidrEntries = core.getInput("additional_cidr_entries");

    const octokit = CreateGithubClient(githubToken);
    const enterprise = await enterprise.getEnterprise(enterpriseSlug, octokit);

    core.info(`Enterprise account: ${enterprise.name} : ${enterprise.url}`);

    if (!metadataKey && !additionalCidrEntries) {
      throw new Error(
        "A set of additionalCidrEntries or GitHub metadataKey must be specified."
      );
    }

    if (metadataKey) {
      const cidrs = await getMetaCIDRs(octokit, metadataKey);
      if (cidrs) {
        core.info(`cidrs: ${JSON.stringify(cidrs)}`);
      } else {
        throw new Error(
          `The metadata CIDRs for '${metadataKey}' were unable to be resolved.`
        );
      }
    }

    if (additionalCidrEntries) {
      const cidrs = getCidrs(additionalCidrEntries);
      core.info(`AdditionalCidr CIDRs to add: ${JSON.stringify(cidrs)}`);
    }
  } catch (err) {
    // canncot find enterpriseSlug or githubToken
    core.setFailed(err);
  }
}

run();

async function getMetaCIDRs(octokit, name) {
  const results = await octokit.rest.meta.get();
  core.info(`Get https://api.github.com/meta GitHub Meta API CIDRs`);

  return results.data[name];
}

function getCidrs(value) {
  try {
    const cidrEntries = YAML.parse(value);
    const result = cidrEntries.map((cidrEntry) => new CidrEntry(cidrEntry));
  } catch (err) {
    throw new Error(`additionalCidrEntries yaml string cannot parse ${err}`);
  }
  return result;
}
