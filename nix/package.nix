{
  lib,
  stdenv,
  buildNpmPackage,
  # dependencies
  fetchurl,
  nodejs_22,
  wl-clipboard,
  xclip,
}:

let
  packageJson = builtins.fromJSON (builtins.readFile ../package.json);
  # packageJson.name is the scoped npm name ("@luxqw/torio") — that's what
  # npm actually installs under $out/lib/node_modules/, but "@" and "/" are
  # not valid in a Nix pname/store path, so the derivation itself uses a
  # separate, Nix-safe identifier.
  npmPackageName = packageJson.name;

  # node-datachannel ships one prebuilt binary per platform; Nix builds run
  # with --ignore-scripts + no network, so the package's own prebuild-install
  # postinstall can't fetch it. Must be regenerated together whenever the
  # node-datachannel version in package-lock.json changes.
  nodeDatachannelVersion = "0.32.3";
  nodeDatachannelPlatforms = {
    x86_64-linux = {
      name = "linux-x64";
      sha256 = "4092afc9cd594a3326eb1bd823da452b227b742ea8222689b2cea6f7344cf67a";
    };
    aarch64-linux = {
      name = "linux-arm64";
      sha256 = "4bdbd80aeb11fb0a903318defe663a833a1f0af2615450fe10dab75c81723445";
    };
  };
  nodeDatachannelPlatform =
    nodeDatachannelPlatforms.${stdenv.hostPlatform.system}
      or (throw "torio: no node-datachannel prebuilt binary pinned for ${stdenv.hostPlatform.system}");
in
buildNpmPackage (finalAttrs: {
  pname = "torio";
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
  # Kept in sync automatically by scripts/update-nix-hash.sh, run as part of
  # the release pipeline (see .releaserc.json). For a manual bump: run
  # `nix run nixpkgs#prefetch-npm-deps -- package-lock.json` and paste the
  # hash it prints here.
  npmDepsHash = "sha256-vin8Oc6bO1OF2Cp4h2s1wC9pZCJEGjg5Z2brqbuZ0/4=";
  # ignore-scripts for ip-set broken preinstall
  npmFlags = [ "--ignore-scripts" ];

  nodeDatachannelPrebuilt = fetchurl {
    url = "https://github.com/murat-dogan/node-datachannel/releases/download/v${nodeDatachannelVersion}/node-datachannel-v${nodeDatachannelVersion}-napi-v8-${nodeDatachannelPlatform.name}.tar.gz";
    sha256 = nodeDatachannelPlatform.sha256;
  };

  # replicate postbuild from package.json
  postBuild = ''
    node scripts/postbuild.cjs
  '';

  # extract node-datachannel tarball, then add wl-copy/xclip to PATH
  postInstall = ''
    tar -xzf ${finalAttrs.nodeDatachannelPrebuilt} \
      -C $out/lib/node_modules/${npmPackageName}/node_modules/node-datachannel
    wrapProgram $out/bin/torio \
      --prefix PATH : ${
        lib.makeBinPath [
          wl-clipboard
          xclip
        ]
      }
  '';

  meta = {
    description = "torio is a torrent finder that lives in your terminal, with zero setup and nothing to configure.";
    homepage = "https://github.com/luxqw/torio";
    changelog = "https://github.com/luxqw/torio/releases/tag/v${finalAttrs.version}";
    license = lib.licenses.mit;
    mainProgram = "torio";
    platforms = builtins.attrNames nodeDatachannelPlatforms;
  };
})
