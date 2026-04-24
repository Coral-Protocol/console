{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    systems.url = "github:nix-systems/default";
  };

  outputs = {
    systems,
    nixpkgs,
    ...
  }: let
    eachSystem = f:
      nixpkgs.lib.genAttrs (import systems) (
        system:
          f {
            pkgs = import nixpkgs {
              inherit system;
              overlays = [];
            };
            inherit system;
          }
      );
  in {
    packages = eachSystem ({pkgs, ...}: let
      inherit (nixpkgs) lib;
      package = lib.importJSON ./package.json;
      cleanName = lib.last (lib.split "/" package.name);
      bundle = {
        basePath,
        apiPath ? basePath,
      }:
        pkgs.stdenv.mkDerivation (finalAttrs: {
          pname = cleanName;
          inherit (package) version;

          src = ./.;

          BASE_PATH = basePath;
          PUBLIC_API_PATH = apiPath;

          yarnOfflineCache = pkgs.yarn-berry_4.fetchYarnBerryDeps {
            yarnLock = finalAttrs.src + "/yarn.lock";
            hash = "";
          };

          nativeBuildInputs = with pkgs; [
            yarn-berry_4
            yarn-berry_4.yarnBerryConfigHook
            nodejs
            npmHooks.npmInstallHook
          ];

          buildPhase = ''
            runHook preBuild

            yarn build

            runHook postBuild
          '';
          installPhase = ''
            runHook preInstall

            mkdir -p $out/
            cp -r deps/${package.name}/build/* $out

            runHook postInstall
          '';
          distPhase = "true";
        });
    in {
      default = bundle {
        basePath = "/ui/console";
        apiPath = "/";
      };
      dev = bundle {
        basePath = "/console";
        apiPath = "/server";
      };
      cloud = bundle {
        basePath = "/console";
        apiPath = "https://api.coralcloud.ai";
      };
    });
    devShells = eachSystem ({pkgs, ...}: {
      default = pkgs.mkShell {
        buildInputs = with pkgs; [
          nodejs
          corepack

          nodePackages.typescript
          nodePackages.typescript-language-server
          svelte-language-server
          tailwindcss-language-server

          prettierd
        ];
      };
    });
  };
}
