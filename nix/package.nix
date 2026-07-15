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
    x86_64-darwin = {
      name = "darwin-x64";
      sha256 = "4f79b7ff0fe035db8d2006842537aca2a2def957569aae6ff578107b56adec38";
    };
    aarch64-darwin = {
      name = "darwin-arm64";
      sha256 = "69fbffdacb9abda2a76809693443328b6aad71af25947e0733913340365f4da8";
    };
  };
  nodeDatachannelPlatform =
    nodeDatachannelPlatforms.${stdenv.hostPlatform.system}
      or (throw "torio: no node-datachannel prebuilt binary pinned for ${stdenv.hostPlatform.system}");
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
  npmDepsHash = "sha256-gxwhrw4R53Ji7dPi7WFrik5DFB/g0ZtuKHR1ihL6z7k=";
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

  # extract node-datachannel tarball; wl-copy/xclip are Linux-only (Wayland/X11),
  # macOS already has pbcopy on PATH so no wrapping is needed there.
  postInstall = ''
    tar -xzf ${finalAttrs.nodeDatachannelPrebuilt} \
      -C $out/lib/node_modules/${finalAttrs.pname}/node_modules/node-datachannel
  ''
  + lib.optionalString stdenv.hostPlatform.isLinux ''
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
