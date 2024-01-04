# MBACSA: Macaroon Based Authorization Configuration for Solid Applications

This repository introduces an implementation of the MBACSA middleware 
for the Community Solid Server.

## About

MBACSA is a middleware for the Community Solid Server and allows Solid agents
to `mint`, `discharge`, `revoke` and `authorize` macaroons for resources, stored in the agent's pod. These newly minted macaroons represent access tokens for specific resources and access modes. Solid agents are enabled to delegate these permissions in a transitive manner to each other by adding third-party caveats. You are free to use the [MBACSA Client](https://github.com/RubenLauwaert/mbacsa-client) for this. Finally, agents can make access requests via these attenuated macaroons, which the middleware will authorize by verifying the provided macaroons. Minting, discharging, delegating and making authorized requests can all be done through the [MBACSA Client](https://github.com/RubenLauwaert/mbacsa-client).


## Running the CSS

In order to run the CSS, you first need to install all the dependencies via the following command:

`npm install`

After you installed all the dependencies, you are given three options to run the adapted CSS.

### Option 1
This option starts the server without initializing any pods:

`npm run build && npm run start`

### Option 2

This option starts the server and seeds the pods for Alice, Bob and Jane:

`npm run build && npm run start -- --seededPodConfigJson ./seedingPods/demo.json`


### Option 3

This option starts the server and initializes 20 different pods. This option should be used for running the [MBACSA Experiments](https://github.com/RubenLauwaert/mbacsa-experiments). Initializing the pods can take a while (1-2min.)

`npm run build && npm run start -- --seededPodConfigJson ./seedingPods/experiments.json`



