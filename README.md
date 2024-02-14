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

## Examples

```yaml
- name: Add Actions to IP Allow List
  uses: kty1965/add-github-meta-ips-to-allowlist@main
  with:
    github_token: ${{ secrets.ENTERPRISE_ACCESS_PAT }}
    enterprise_slug: ENTERPRISE_NAME
    metadata_key: actions
```

```yaml
- name: Add additional cidr entries to IP Allow List
  uses: kty1965/add-github-meta-ips-to-allowlist@main
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
