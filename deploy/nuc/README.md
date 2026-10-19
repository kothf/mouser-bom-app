# Deploying aerocat.tech/bom on the NUC

Cron runs `auto-deploy.sh` every 5 minutes. When `main` on GitHub has moved, it
builds the image from this checkout and swaps the container, so a merged PR is
live at https://aerocat.tech/bom within a few minutes. The release image on GHCR
is not used here.

What a run does:

1. Fetch `main` and fast-forward `~/mouser-bom-app` (it refuses to touch a
   checkout on another branch or with local edits).
2. If that commit is not deployed yet, build `mouser-bom-local:<commit>`, point
   `mouser-bom-local:current` at it and recreate the `mouser-bom` container with
   `docker-compose.yml` plus `compose.nuc.yml`.
3. Check that `/bom` answers and `/bom/version.txt` names the new commit. If the
   build or the check fails, the previous image goes back live, and the commit
   is retried 3 times, 15 minutes apart, then waits for a new commit.
4. Keep the newest 3 builds for rollback and report to Uptime Kuma, if set.

The live commit: https://aerocat.tech/bom/version.txt. The log:
`~/aerocat/bom-auto-deploy.log` (rotated at 5 MB).

## Roll back

```bash
~/mouser-bom-app/deploy/nuc/auto-deploy.sh --list          # * marks the live image
~/mouser-bom-app/deploy/nuc/auto-deploy.sh --rollback      # back to the previous image
~/mouser-bom-app/deploy/nuc/auto-deploy.sh --rollback TAG  # or a given one
```

A rollback stays live until `main` moves again, so revert the bad commit on
GitHub too.

## Setup

Crontab of `pinkfloyd` (`crontab -e`):

```text
*/5 * * * * /bin/bash /home/pinkfloyd/mouser-bom-app/deploy/nuc/auto-deploy.sh >> /home/pinkfloyd/aerocat/bom-auto-deploy.log 2>&1
```

Settings are read from `~/.config/aerocat/deploy.env`, shared with the website
deploy; the ones for this script start with `BOM_` (see the top of
`auto-deploy.sh`). For alerts, add a separate Push monitor in Uptime Kuma with a
900 s heartbeat interval and put its Push URL in `BOM_KUMA_PUSH_URL`.
