import {useCallback, useState} from 'react';

import {StargazerEIPProvider} from '../stargazer-types';

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

const useStargazerWallet = () => {
  const [provider, setProvider] = useState<StargazerEIPProvider | null>(null);
  const [dagAccounts, setDagAccounts] = useState<string[] | null>(null);

  const onDagAccountsChanged = useCallback(
    (accounts: string[]) => {
      setDagAccounts(accounts);
    },
    [provider]
  );

  const onDagClose = useCallback(() => {
    setDagAccounts(null);
    setProvider(null);
  }, [provider]);

  const state: IStargazerWalletHookState = {
    activate: async () => {
      if (!window.stargazer) {
        throw new Error('StargazerConnector: Not available at global scope');
      }

      if (!('version' in window.stargazer)) {
        throw new Error('Unsupported stargazer version');
      }

      const provider = window.stargazer.getProvider('constellation');

      try {
        const dagAccounts: string[] = await provider.request({
          method: 'dag_accounts'
        });
        if (dagAccounts.length === 0) {
          throw new Error('Unable to activate stargazer wallet for constellation network');
        }
        provider.on('accountsChanged', onDagAccountsChanged);
        provider.on('disconnect', onDagClose);

        onDagAccountsChanged(dagAccounts);
        setProvider(provider);
      } catch (e) {
        console.error('activate:error -> ', e);
        throw e;
      }
    },
    deactivate: async () => {
      if (!provider) {
        return;
      }
      provider.removeListener('accountsChanged', onDagAccountsChanged);
      provider.removeListener('disconnect', onDagClose);
      onDagClose();
    },
    ...(dagAccounts && provider
      ? {
          active: true,
          account: dagAccounts[0],
          provider: provider,
          request: provider.request
        }
      : {active: false})
  };

  return state;
};

export {useStargazerWallet, type IStargazerWalletHookState};
