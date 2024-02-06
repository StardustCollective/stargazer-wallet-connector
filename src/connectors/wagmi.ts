/* eslint-disable @typescript-eslint/ban-types */
import {ChainNotConfiguredError, createConnector, normalizeChainId} from 'wagmi';
import {
  getAddress,
  UserRejectedRequestError,
  numberToHex,
  SwitchChainError,
  ProviderRpcError
} from 'viem';

import {StargazerEIPProvider} from '../stargazer-types';

type StargazerWalletWagmiConnectorParameters = Record<string, never>;

stargazerWalletWagmiConnector.type = 'stargazerWallet' as const;
stargazerWalletWagmiConnector.id = 'stargazerWalletEIP1193' as const;
function stargazerWalletWagmiConnector(parameters: StargazerWalletWagmiConnectorParameters) {
  type Provider = StargazerEIPProvider;
  type Properties = {};

  let walletProvider: Provider | undefined;

  return createConnector<Provider, Properties>((config) => ({
    id: 'stargazerWalletEIP1193',
    name: 'Stargazer Wallet',
    type: stargazerWalletWagmiConnector.type,
    async connect({chainId} = {}) {
      try {
        const provider = await this.getProvider();
        const accounts = (
          (await provider.request({
            method: 'eth_accounts'
          })) as string[]
        ).map((x) => getAddress(x));

        provider.on('accountsChanged', this.onAccountsChanged);
        provider.on('chainChanged', this.onChainChanged);
        provider.on('disconnect', this.onDisconnect.bind(this));

        // Switch to chain if provided
        let currentChainId = await this.getChainId();
        if (chainId && currentChainId !== chainId) {
          const chain = await this.switchChain!({chainId}).catch((error) => {
            if (error.code === UserRejectedRequestError.code) {
              throw error;
            }
            return {id: currentChainId};
          });
          currentChainId = chain.id ?? currentChainId;
        }

        return {accounts, chainId: currentChainId};
      } catch (error) {
        if (
          /(user closed modal|accounts received is empty|user denied account)/i.test(
            (error as Error).message
          )
        )
          throw new UserRejectedRequestError(error as Error);
        throw error;
      }
    },
    async disconnect() {
      const provider = await this.getProvider();

      provider.removeListener('accountsChanged', this.onAccountsChanged);
      provider.removeListener('chainChanged', this.onChainChanged);
      provider.removeListener('disconnect', this.onDisconnect.bind(this));
    },
    async getAccounts() {
      const provider = await this.getProvider();

      if (!provider.activated) {
        return [];
      }

      return (
        await provider.request<string[]>({
          method: 'eth_accounts'
        })
      ).map((x) => getAddress(x));
    },
    async getChainId() {
      const provider = await this.getProvider();
      const chainId = await provider.request<string>({
        method: 'eth_chainId'
      });
      return normalizeChainId(chainId);
    },
    async getProvider() {
      if (!walletProvider) {
        if (!window.stargazer) {
          throw new Error('Unable to detect stargazer');
        }

        if (!('version' in window.stargazer)) {
          throw new Error('Unsupported stargazer version');
        }

        walletProvider = window.stargazer.getProvider('ethereum');
      }
      return walletProvider!;
    },
    async isAuthorized() {
      try {
        const accounts = await this.getAccounts();
        return !!accounts.length;
      } catch {
        return false;
      }
    },
    async switchChain({chainId}) {
      const chain = config.chains.find((chain) => chain.id === chainId);
      if (!chain) throw new SwitchChainError(new ChainNotConfiguredError());

      const provider = await this.getProvider();
      const chainId_ = numberToHex(chain.id);

      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{chainId: chainId_}]
        });
        return chain;
      } catch (error) {
        // Indicates chain is not added to provider
        if ((error as ProviderRpcError).code === 4902) {
          try {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: chainId_,
                  chainName: chain.name,
                  nativeCurrency: chain.nativeCurrency,
                  rpcUrls: [chain.rpcUrls.default.http[0] ?? ''],
                  blockExplorerUrls: [chain.blockExplorers?.default.url]
                }
              ]
            });
            return chain;
          } catch (error) {
            throw new UserRejectedRequestError(error as Error);
          }
        }

        throw new SwitchChainError(error as Error);
      }
    },
    onAccountsChanged(accounts) {
      if (accounts.length === 0) {
        config.emitter.emit('disconnect');
      } else {
        config.emitter.emit('change', {
          accounts: accounts.map((x) => getAddress(x))
        });
      }
    },
    onChainChanged(chain) {
      const chainId = normalizeChainId(chain);
      config.emitter.emit('change', {chainId});
    },
    async onDisconnect(_error) {
      config.emitter.emit('disconnect');

      const provider = await this.getProvider();
      provider.removeListener('accountsChanged', this.onAccountsChanged);
      provider.removeListener('chainChanged', this.onChainChanged);
      provider.removeListener('disconnect', this.onDisconnect.bind(this));
    }
  }));
}

export {stargazerWalletWagmiConnector, type StargazerWalletWagmiConnectorParameters};
