# Stargazer Wallet Connectors

The official Web 3 connectors ([`web3-react`](https://github.com/NoahZinsmeister/web3-react/tree/v6), [`wagmi`](https://wagmi.sh/), [`react-hooks`](https://react.dev/reference/react/hooks)) for the Stargazer Wallet.

## Install

If you're using NPM

`npm install @stardust-collective/web3-react-stardust-collective/web3-react-stargazer-connector`

If you're using Yarn

`yarn add @stardust-collective/web3-react-stardust-collective/web3-react-stargazer-connector`

## Example (web3-react)

```typescript
import {StargazerWeb3ReactConnector} from 'stardust-collective/web3-react-stargazer-connector';

const stargazerConnector = new StargazerWeb3ReactConnector({
  supportedChainIds: [1, 3]
});
```

## Example (wagmi)

```typescript
import {stargazerWalletWagmiConnector} from 'stardust-collective/web3-react-stargazer-connector';

const stargazerConnector = stargazerWalletWagmiConnector();


```

## Example (react-hooks)

```typescript
import {useStargazerWallet} from 'stardust-collective/web3-react-stargazer-connector';

type IStargazerWalletHookState = {
  activate: () => Promise<void>;
  deactivate: () => Promise<void>;
} & (
  | {
      active: true;
      account: string;
      provider: StargazerEIPProvider;
      request: StargazerEIPProvider['request'];
    }
  | {active: false}
);

const stargazerWalletState = useStargazerWallet();

const {activate, deactivate, ...state}: IStargazerWalletHookState = stargazerWalletState;

/*
 * Requests wallet activation for Constellation (DAG) accounts
 */
await activate();

/*
 * Resets state, deactivates the wallet
 */
await deactivate();

/*
 * Contains information about the current connected wallet,
 * and exposes a EIP-1193 provider to interact with the wallet
 * 
 * More info about the RPC EIP-1193 API:
 * https://docs.constellationnetwork.io/stargazer/APIReference/constellationRPCAPI/
 */ 
state;
```

## Development

This project runs on `TypeScript 5`, `Node 18`, and `web3-react 6`.

### `yarn build`

Builds the project and stores its contents in the ./dist folder.

### `yarn dev`

Builds the project and watches for changes.

## License

This project is licensed under the [MIT License](./LICENSE)
