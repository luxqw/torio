{
  lib,
  buildNpmPackage,
  # dependencies
  fetchurl,
  nodejs_22,
  wl-clipboard,
  xclip,
}:

let
  packageJson = builtins.fromJSON (builtins.readFile ../package.json);
in
buildNpmPackage (finalAttrs: {
  # npm package name (package.json "name"), not a display name — this is
  # also the directory npm installs the package into under
  # $out/lib/node_modules, which postInstall below depends on.
  pname = packageJson.name;
  # Derived from package.json rather than hardcoded, so it can't drift from
  # what's actually built (see PR review discussion).
  inherit (packageJson) version;
  __structuredAttrs = true;
  strictDeps = true;

  # Build from this checkout instead of re-fetching the repo from GitHub —
  # this file packages the project it lives in, it isn't a nixpkgs-style
  # package definition pointing at an external source.
  src = ../.;

  nodejs = nodejs_22;
  # Must be regenerated whenever package-lock.json changes: run
  # `nix run nixpkgs#prefetch-npm-deps -- package-lock.json` and paste the
  # hash it prints here.
  npmDepsHash = "sha256-mQBy7yoU18hZ9ZSk5xMrbewg9PMMKr4PWOJKV2hkmY4=";
  # ignore-scripts for ip-set broken preinstall
  npmFlags = [ "--ignore-scripts" ];

  # node-datachannel binary tarball. Version/hash must track the
  # node-datachannel resolution in pnpm-lock.yaml/package-lock.json — bump
  # both together when dependencies update.
  nodeDatachannelPrebuilt = fetchurl {
    url = "https://github.com/murat-dogan/node-datachannel/releases/download/v0.32.3/node-datachannel-v0.32.3-napi-v8-linux-x64.tar.gz";
    sha256 = "4092afc9cd594a3326eb1bd823da452b227b742ea8222689b2cea6f7344cf67a";
  };

  # replicate postbuild from package.json
  postBuild = ''
    node scripts/postbuild.cjs
  '';

  # extract node-datachannel tarball
  # add wl-copy and xclip to nix readeable path
  postInstall = ''
    tar -xzf ${finalAttrs.nodeDatachannelPrebuilt} \
      -C $out/lib/node_modules/${finalAttrs.pname}/node_modules/node-datachannel
      wrapProgram $out/bin/torio \
        --prefix PATH : ${
          lib.makeBinPath [
            wl-clipboard
            xclip
          ]
        }

    # The "ip-set" override (package.json overrides -> file:src/vendor/ip-set)
    # resolves to a dangling symlink once hoisted under webtorrent's nested
    # load-ip-set — reproduces with plain `npm ci` too, nothing Nix-specific.
    # ip-set is only dereferenced when a blocklist is passed to WebTorrent,
    # which torio never does, so it's harmless at runtime, but Nix's
    # noBrokenSymlinks check still fails the build on it. Swap the dangling
    # symlink for the real vendored copy.
    ip_set_link="$out/lib/node_modules/${finalAttrs.pname}/node_modules/ip-set"
    if [ -L "$ip_set_link" ] && [ ! -e "$ip_set_link" ]; then
      rm "$ip_set_link"
      cp -r ${finalAttrs.src}/src/vendor/ip-set "$ip_set_link"
    fi
  '';

  meta = {
    description = "torio is a torrent finder that lives in your terminal, with zero setup and nothing to configure.";
    homepage = "https://github.com/y-tretyakov/torio";
    changelog = "https://github.com/y-tretyakov/torio/releases/tag/v${finalAttrs.version}";
    license = lib.licenses.mit;
    mainProgram = "torio";
    platforms = lib.platforms.linux;
  };
})
