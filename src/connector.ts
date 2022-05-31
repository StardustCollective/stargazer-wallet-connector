import {AbstractConnector} from '@web3-react/abstract-connector';
import {ConnectorUpdate, AbstractConnectorArguments} from '@web3-react/types';

import {StargazerEIPProvider} from './stargazer-types';
import {bindAllMethods} from './utils';
import {logger} from './logger';
import {StargazerConnectorError, StargazerConnectorUserRejectionError} from './errors';

class StargazerConnector extends AbstractConnector {
  #ethProvider: StargazerEIPProvider | null;
  #dagProvider: StargazerEIPProvider | null;
  #ethAccounts: string[];
  #dagAccounts: string[];

  constructor(kwargs: AbstractConnectorArguments) {
    super(kwargs);
    bindAllMethods(this);

    this.#ethProvider = null;
    this.#dagProvider = null;
    this.#ethAccounts = [];
    this.#dagAccounts = [];

    if (
      window.stargazer &&
      'getProvider' in window.stargazer &&
      typeof window.stargazer.getProvider === 'function'
    ) {
      this.#ethProvider = window.stargazer.getProvider('ethereum');
      this.#dagProvider = window.stargazer.getProvider('constellation');
    }

    if (this.#ethProvider === null) {
      logger.warn('Ethereum provider is not available');
    }

    if (this.#dagProvider === null) {
      logger.warn('Constellation provider is not available');
    }
  }

  get ethProvider() {
    if (!this.#ethProvider) {
      throw new StargazerConnectorError('StargazerConnector: Ethereum provider is not available');
    }
    return this.#ethProvider;
  }

  get dagProvider() {
    if (!this.#dagProvider) {
      throw new StargazerConnectorError(
        'StargazerConnector: Constellation provider is not available'
      );
    }
    return this.#dagProvider;
  }

  get ethAccounts() {
    return [...this.#ethAccounts];
  }

  get dagAccounts() {
    return [...this.#dagAccounts];
  }

  private onEthChainChanged(chainId: string | number) {
    logger.debug('onEthChainChanged -> ', chainId);
    this.emitUpdate({chainId, provider: this.ethProvider});
  }

  private onEthAccountsChanged(accounts: string[]) {
    logger.debug('onEthAccountsChanged -> ', accounts);

    this.#ethAccounts = accounts;

    if (this.#ethAccounts.length === 0 && this.#dagAccounts.length === 0) {
      this.emitDeactivate();
    } else {
      this.emitUpdate({account: accounts[0], provider: this.ethProvider});
    }
  }

  private onEthNetworkChanged(networkId: string | number) {
    logger.debug('onEthNetworkChanged -> ', networkId);
    this.emitUpdate({chainId: networkId, provider: this.ethProvider});
  }

  private onEthClose() {
    logger.debug('onEthClose');
    this.emitDeactivate();
  }

  private emitDagUpdate(update: {account: string}): void {
    this.emit('ConstellationUpdate', update);
  }

  private onDagAccountsChanged(accounts: string[]) {
    logger.debug('onDagAccountsChanged -> ', accounts);

    this.#dagAccounts = accounts;

    if (this.#ethAccounts.length === 0 && this.#dagAccounts.length === 0) {
      this.emitDeactivate();
    } else {
      this.emitDagUpdate({account: accounts[0]});
    }
  }

  private onDagClose() {
    logger.debug('onDagClose');
    this.emitDeactivate();
  }

  async request(request: Parameters<StargazerEIPProvider['request']>[0]): Promise<any> {
    let response: any;

    try {
      if (request.method.startsWith('dag_')) {
        response = await this.dagProvider.request(request);
      } else {
        response = await this.ethProvider.request(request);
      }
    } catch (e) {
      logger.error('request:error -> ', e);

      if ((e as any).code === 4001) {
        throw new StargazerConnectorUserRejectionError();
      } else {
        throw e;
      }
    }

    return typeof response === 'object' && response !== null && 'result' in response
      ? response.result
      : response;
  }

  async activate(): Promise<ConnectorUpdate> {
    if (!this.#ethProvider || !this.#dagProvider) {
      throw new StargazerConnectorError('StargazerConnector: Providers are not available');
    }

    this.ethProvider.on('chainChanged', this.onEthChainChanged);
    this.ethProvider.on('networkChanged', this.onEthNetworkChanged);
    this.ethProvider.on('accountsChanged', this.onEthAccountsChanged);
    this.ethProvider.on('close', this.onEthClose);

    this.dagProvider.on('accountsChanged', this.onDagAccountsChanged);
    this.dagProvider.on('close', this.onDagClose);

    let account;
    try {
      const ethAccounts = await this.request({method: 'eth_requestAccounts'});
      logger.debug('activate:ethAccounts -> ', ethAccounts);

      const dagAccounts = await this.request({method: 'dag_accounts'});
      logger.debug('activate:dagAccounts -> ', dagAccounts);

      account = ethAccounts[0];

      this.onEthAccountsChanged(ethAccounts);
      this.onDagAccountsChanged(dagAccounts);
    } catch (e) {
      logger.error('activate:error -> ', e);
      throw e;
    }

    return {provider: this.ethProvider, ...(account ? {account} : {})};
  }

  async getProvider(): Promise<StargazerEIPProvider> {
    return this.ethProvider;
  }

  async getChainProvider(chain: 'ethereum' | 'constellation'): Promise<StargazerEIPProvider> {
    return chain === 'ethereum' ? this.ethProvider : this.dagProvider;
  }

  async getChainId(): Promise<string | number> {
    return await this.ethProvider.request({method: 'eth_chainId'});
  }

  async getAccount(): Promise<string | null> {
    try {
      return (await this.ethProvider.request({method: 'eth_accounts'}))[0];
    } catch (e) {
      return null;
    }
  }

  deactivate(): void {
    try {
      this.ethProvider.removeListener('chainChanged', this.onEthChainChanged);
      this.ethProvider.removeListener('networkChanged', this.onEthNetworkChanged);
      this.ethProvider.removeListener('accountsChanged', this.onEthAccountsChanged);
      this.ethProvider.removeListener('close', this.onEthClose);
    } catch (e) {
      logger.warn('deactivate:error -> ', e);
    }
  }

  async isAuthorized(): Promise<boolean> {
    try {
      return (await this.request({method: 'eth_accounts'})).length > 0;
    } catch {
      return false;
    }
  }
}

export {StargazerConnector};
