import { throttling } from "@octokit/plugin-throttling";
import { retry } from "@octokit/plugin-retry";
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { paginateRest } from "@octokit/plugin-paginate-rest";

const RetryThrottlingOctokit = Octokit.plugin(
  throttling,
  retry,
  restEndpointMethods,
  paginateRest
);

module.exports.create = (token, maxRetries) => {
  const MAX_RETRIES = maxRetries ? maxRetries : 3;

  const octokit = new RetryThrottlingOctokit({
    auth: `token ${token}`,

    throttle: {
      onRateLimit: (retryAfter, options) => {
        octokit.log.warn(
          `Request quota exhausted for request ${options.method} ${options.url}`
        );
        octokit.log.warn(
          `  request retries: ${options.request.retryCount}, MAX: ${MAX_RETRIES}`
        );

        if (options.request.retryCount < MAX_RETRIES) {
          octokit.log.warn(`Retrying after ${retryAfter} seconds.`);
          return true;
        }
      },

      onAbuseLimit: (retryAfter, options) => {
        octokit.log.warn(
          `Abuse detection triggered request ${options.method} ${options.url}`
        );
        return false;
      },
    },
  });

  return octokit;
};
