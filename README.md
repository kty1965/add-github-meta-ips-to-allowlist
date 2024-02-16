# add-github-meta-ips-to-allowlist

A GitHub Action that will load Enterprise IP Allow List Entries from the [GitHub meta API](https://api.github.com/meta).

## Prerequisite

- Make Github PAT(classic) which has `admin:enterprise` permission

- In first, process this workflow need to disable ip allowlist in Enterprise setting

## Inputs

| name                      | required | description                                                                                                                                                             |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github_token`            | true     | A GitHub Access Token that has the `admin:enterprise` permission. `Required`                                                                                            |
| `enterprise_slug`         | true     | The slug for the enterprise account to be modified. `Required`                                                                                                          |
| `metadata_key`            | false    | Check the [meta API](https://api.github.com/meta), `dependabot`, `actions`, `importer`, `pages`, `packages`, `github_enterprise_importer`, `git`, `api`, `web`, `hooks` |
| `additional_cidr_entries` | false    | additional cidr entries with yaml string names                                                                                                                          |
| `scope`                   | false    | default: `@scope`, select prefix of name                                                                                                                                |
| `mode`                    | false    | default: `sync`, mode `sync`, `delete` available                                                                                                                        |

## Environments

| name              | description                                 |
| ----------------- | ------------------------------------------- |
| `API_CONCURRENCY` | using request to github graphql concurrency |

## Examples

> if you change input `scope` already created allowlist does not changed.
> The scope groups only the allowList that we want to manage.

- only metadata actions

  ```yaml
  - name: Add Actions to IP Allow List
    uses: kty1965/add-github-meta-ips-to-allowlist@v0.1.0
    with:
      github_token: ${{ secrets.ENTERPRISE_ACCESS_PAT }}
      enterprise_slug: ENTERPRISE_NAME
      metadata_key: actions
  ```

- only additional_cidr_entries

  ```yaml
  - name: Add additional cidr entries to IP Allow List
    uses: kty1965/add-github-meta-ips-to-allowlist@v0.1.0
    with:
      github_token: ${{ secrets.ENTERPRISE_ACCESS_PAT }}
      enterprise_slug: ENTERPRISE_NAME
      additional_cidr_entries: |
        - name: internal-vpc-a
          cidr: 10.0.0.0/16
          isActive: true
        - name: internal-vpc-b
          cidr: 10.1.0.0/16
          isActive: false
  ```

- everyday sync & trigger on github web

  ```yaml
  on:
    push:
      branches:
        - main
    # https://api.github.com/meta ip cidrs can change, so every day sync
    schedule:
      - cron: '0 20 * * *'
    # workflow can trigger on github web
    workflow_call:

  concurrency:
    group: ${{ github.workflow }}
    cancel-in-progress: false

  jobs:
    github-ip-allow-list-sync:
      runs-on: ubuntu-22.04
      steps:
        - name: Add Custom CIDRs to IP Allow List
          env:
            UV_THREADPOOL_SIZE: 32
          uses: kty1965/add-github-meta-ips-to-allowlist@v0.1.0
          with:
            github_token: ${{ secrets.ENTERPRISE_ACCESS_PAT }}
            enterprise_slug: modusign
            metadata_key: actions
            scope: '@scope'
            mode: 'sync'
            additional_cidr_entries: |
              - name: internal-vpc-a
                cidr: 10.0.0.0/16
                isActive: true
              - name: internal-vpc-b
                cidr: 10.1.0.0/16
                isActive: false
  ```
