#!/usr/bin/env bash
# Run by semantic-release (see .releaserc.json) between the npm version bump
# and the git commit, so nix/package.nix's npmDepsHash never drifts from
# package-lock.json again — every release fixed this by hand until now.
set -euo pipefail

hash=$(nix run nixpkgs#prefetch-npm-deps -- package-lock.json 2>/dev/null | tail -1)
sed -i "s|npmDepsHash = \"sha256-[^\"]*\";|npmDepsHash = \"${hash}\";|" nix/package.nix

echo "nix/package.nix npmDepsHash -> ${hash}"
