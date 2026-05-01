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
        deployment ? "local",
      }:
        pkgs.mkYarnPackage {
          inherit (package) version;
          name = cleanName;
          src = ./.;
          packageJson = ./package.json;
          yarnLock = ./yarn.lock;

          BASE_PATH = basePath;
          PUBLIC_API_PATH = apiPath;
          PUBLIC_DEPLOYMENT = deployment;

          buildPhase = ''
            yarn --offline --frozen-lockfile build
          '';
          installPhase = ''
            runHook preInstall

            mkdir -p $out/
            cp -r deps/${package.name}/build/* $out

            runHook postInstall
          '';
          distPhase = "true";
        };
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
        deployment = "cloud";
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
