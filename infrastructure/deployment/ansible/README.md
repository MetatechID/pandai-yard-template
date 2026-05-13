# ansible

This directory is intentionally close to empty.

The actual ansible playbooks for prod live in a SEPARATE ops repo (private, restricted
to VP Eng + SRE rotation). Putting them here would mix an audit-controlled secrets-aware
codebase with the application code. We don't.

What lives here:

- A pointer (this README).
- (Eventually) per-service inventories that are safe to share with all engineers
  (no secrets). Today: nothing.

## How to view the real playbooks

```sh
# you need ops repo access — request via #it-access
git clone git@internal:ops/nusantara-ansible.git
```

## Why is this here at all then?

Because the deploy scripts on titan-prod-01 (`deploy.sh`) reference paths that originally
expected this directory to exist on the deploy node. We've cleaned up most of that,
but a couple of references remain (NUS-2890).

When NUS-2890 ships, this directory might be deleted entirely. Until then it stays.
