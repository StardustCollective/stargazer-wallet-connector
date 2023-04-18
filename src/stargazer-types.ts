type StargazerEIPProvider = {
  request: (request: {method: string; params?: any[]}) => Promise<any>;
  on: (method: string, listener: Function) => void;
  removeListener: (method: string, listener: Function) => void;
};

type Chains = 'ethereum' | 'constellation' | 'polygon' | 'bsc' | 'avalanche';

type StargazerEIPProviderManager = {
  version: string | number;
  getProvider: (chain: Chains) => StargazerEIPProvider;
  isConnected: () => Promise<boolean>;
  enable: () => Promise<string[]>;
};

type StargazerEIPWindowScope = {
  SUPPORTED_WALLET_METHODS?: Record<any, any>;
  stargazer?: StargazerEIPProviderManager | StargazerEIPProvider;
};

declare global {
  interface Window extends StargazerEIPWindowScope {}
}

export type {StargazerEIPProvider, StargazerEIPProviderManager, StargazerEIPWindowScope, Chains};
