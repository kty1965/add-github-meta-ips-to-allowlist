const { throttling } = require("@octokit/plugin-throttling");
const { retry } = require("@octokit/plugin-retry");
const { Octokit } = require("@octokit/core");
const {
  restEndpointMethods,
} = require("@octokit/plugin-rest-endpoint-methods");
const { paginateRest } = require("@octokit/plugin-paginate-rest");

const RetryThrottlingOctokit = Octokit.plugin(
  throttling,
  retry,
  restEndpointMethods,
  paginateRest
);

export const CreateGithubClient = (token, maxRetries = 3) => {
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
      onSecondaryRateLimit: (retryAfter, options, octokit) => {
        // does not retry, only logs a warning
        octokit.log.warn(
          `SecondaryRateLimit detected for request ${options.method} ${options.url}`
        );
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
