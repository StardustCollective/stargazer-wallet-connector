# Stargazer Wallet Connector `(web3-react)`

The official [`web3-react`](https://github.com/NoahZinsmeister/web3-react/tree/v6) connector for the Stargazer Wallet.

## Install
If you're using NPM

`npm install @stardust-collective/web3-react-stargazer-connector`

If you're using Yarn

`yarn add @stardust-collective/web3-react-stargazer-connector`

## Arguments

```typescript
supportedChainIds?: number[]
```

## Example

```typescript
import {StargazerConnector} from 'stargazer-connector';

const stargazerConnector = new StargazerConnector({
  supportedChainIds: [1, 3]
});
```

## Development
This project runs on `TypeScript 4.7`, `Node 16.13`, and `web3-react 6`.

### `yarn build`
Builds the project and stores its contents in the ./dist folder.

### `yarn dev`
Builds the project and watches for changes.

## License
This project is licensed under the [MIT License](./LICENSE)