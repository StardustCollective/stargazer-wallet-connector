import {AbstractConnector} from '@web3-react/abstract-connector';
import {ConnectorUpdate, AbstractConnectorArguments} from '@web3-react/types';
import {Chains, StargazerEIPProvider} from './stargazer-types';
import {bindAllMethods} from './utils';
import {logger} from './logger';
import {StargazerConnectorError, StargazerConnectorUserRejectionError} from './errors';

class StargazerConnector extends AbstractConnector {

  #activeEVMProvider: StargazerEIPProvider | null;
  #ethProvider: StargazerEIPProvider | null;
  #polygonProvider: StargazerEIPProvider | null;
  #bscProvider: StargazerEIPProvider | null;
  #avalancheProvider: StargazerEIPProvider | null;
  #dagProvider: StargazerEIPProvider | null;
  #ethAccounts: string[];
  #dagAccounts: string[];

  constructor(kwargs: AbstractConnectorArguments) {
    super(kwargs);
    bindAllMethods(this);

    this.#activeEVMProvider = null;
    this.#ethProvider = null;
    this.#polygonProvider = null;
    this.#bscProvider = null;
    this.#avalancheProvider = null;
    this.#dagProvider = null;
    this.#ethAccounts = [];
    this.#dagAccounts = [];

    if (
      window.stargazer &&
      'getProvider' in window.stargazer &&
      typeof window.stargazer.getProvider === 'function'
    ) {
      this.#ethProvider = window.stargazer.getProvider('ethereum');
      this.#polygonProvider = window.stargazer.getProvider('polygon');
      this.#bscProvider = window.stargazer.getProvider('bsc');
      this.#avalancheProvider = window.stargazer.getProvider('avalanche');
      this.#dagProvider = window.stargazer.getProvider('constellation');

      // Initialize the active provider with the Ethereum provider
      this.#activeEVMProvider = this.#ethProvider;
    }

    if (this.#ethProvider === null) {
      logger.warn('Ethereum provider is not available');
    }

    if (this.#polygonProvider === null) {
      logger.warn('Polygon provider is not available');
    }

    if (this.#bscProvider === null) {
      logger.warn('BSC provider is not available');
    }

    if (this.#avalancheProvider === null) {
      logger.warn('Avalanche provider is not available');
    }

    if (this.#dagProvider === null) {
      logger.warn('Constellation provider is not available');
    }
  }

  get activeEVMProvider() {
    if (!this.#activeEVMProvider) {
      throw new StargazerConnectorError('StargazerConnector: Active EVM provider is not available');
    }
    return this.#activeEVMProvider;
  }

  get ethProvider() {
    if (!this.#ethProvider) {
      throw new StargazerConnectorError('StargazerConnector: Ethereum provider is not available');
    }
    return this.#ethProvider;
  }

  get polygonProvider() {
    if (!this.#polygonProvider) {
      throw new StargazerConnectorError('StargazerConnector: Polygon provider is not available');
    }
    return this.#polygonProvider;
  }

  get bscProvider() {
    if (!this.#bscProvider) {
      throw new StargazerConnectorError('StargazerConnector: BSC provider is not available');
    }
    return this.#bscProvider;
  }

  get avalancheProvider() {
    if (!this.#avalancheProvider) {
      throw new StargazerConnectorError('StargazerConnector: Avalanche provider is not available');
    }
    return this.#avalancheProvider;
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

  private onChainChanged(chainId: string | number) {
    logger.debug('onChainChanged -> ', chainId);
    this.emitUpdate({chainId, provider: this.activeEVMProvider});
  }

  private onAccountsChanged(accounts: string[]) {
    logger.debug('onAccountsChanged -> ', accounts);

    this.#ethAccounts = accounts;

    if (this.#ethAccounts.length === 0 && this.#dagAccounts.length === 0) {
      this.emitDeactivate();
    } else {
      this.emitUpdate({account: accounts[0], provider: this.activeEVMProvider});
    }
  }

  private onClose() {
    logger.debug('onClose');
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

  async switchEVMProvider(chain: Chains) {
    // Check if the evm chain is supported
    if (!['ethereum', 'bsc', 'polygon', 'avalanche'].includes(chain)) {
      throw new StargazerConnectorError('Unsupported chain');
    }

    // Deactivate the previous provider -> Remove all listeners
    await this.deactivate();

    // Set the new provider
    const provider = await this.getChainProvider(chain);
    this.#activeEVMProvider = provider;

    // Activate the provider -> Add all listeners
    await this.activate();

    // Emit an update event on the chain id
    const chainId = await this.getChainId();
    this.onChainChanged(chainId);
  }

  async request(request: Parameters<StargazerEIPProvider['request']>[0]): Promise<any> {
    let response: any;

    try {
      if (request.method.startsWith('dag_')) {
        response = await this.dagProvider.request(request);
      } else {
        response = await this.activeEVMProvider.request(request);
      }
    } catch (e) {
      logger.error('request:error -> ', e);

      if ((e as any).code === 4001) {
        throw new StargazerConnectorUserRejectionError();
      }

      throw e;
    }

    return typeof response === 'object' && response !== null && 'result' in response
      ? response.result
      : response;
  }

  async activate(): Promise<ConnectorUpdate> {
    if (!this.#activeEVMProvider || !this.#ethProvider || !this.#polygonProvider || !this.#bscProvider || !this.#avalancheProvider || !this.#dagProvider) {
      throw new StargazerConnectorError('StargazerConnector: Providers are not available');
    }

    let account: string;
    try {
      const ethAccounts = await this.activeEVMProvider.request({method: 'eth_accounts'});
      logger.debug('activate:ethAccounts -> ', ethAccounts);

      const dagAccounts = await this.dagProvider.request({method: 'dag_accounts'});
      logger.debug('activate:dagAccounts -> ', dagAccounts);

      account = ethAccounts[0];

      this.onAccountsChanged(ethAccounts);
      this.onDagAccountsChanged(dagAccounts);
    } catch (e) {
      logger.error('activate:error -> ', e);
      throw e;
    }

    this.activeEVMProvider.on('chainChanged', this.onChainChanged);
    this.activeEVMProvider.on('accountsChanged', this.onAccountsChanged);
    this.activeEVMProvider.on('disconnect', this.onClose);

    this.dagProvider.on('accountsChanged', this.onDagAccountsChanged);
    this.dagProvider.on('disconnect', this.onDagClose);

    return {provider: this.activeEVMProvider, ...(account ? {account} : {})};
  }

  async getProvider(): Promise<StargazerEIPProvider> {
    return this.activeEVMProvider;
  }

  async getChainProvider(chain: Chains): Promise<StargazerEIPProvider> {
    if (chain === 'ethereum') {
      return this.ethProvider;
    }
    
    if (chain === 'polygon') {
      return this.polygonProvider;
    }

    if (chain === 'bsc') {
      return this.bscProvider;
    }

    if (chain === 'avalanche') {
      return this.avalancheProvider;
    }

    if (chain === 'constellation') {
      return this.dagProvider;
    }

    throw new StargazerConnectorError('Unsupported chain');
  }

  async getChainId(): Promise<string | number> {
    return await this.activeEVMProvider.request({method: 'eth_chainId'});
  }

  async getAccount(): Promise<string | null> {
    try {
      return (await this.activeEVMProvider.request({method: 'eth_accounts'}))[0];
    } catch (e) {
      return null;
    }
  }

  deactivate(): void {
    try {
      this.activeEVMProvider.removeListener('chainChanged', this.onChainChanged);
      this.activeEVMProvider.removeListener('accountsChanged', this.onAccountsChanged);
      this.activeEVMProvider.removeListener('disconnect', this.onClose);

      this.dagProvider.removeListener('accountsChanged', this.onDagAccountsChanged);
      this.dagProvider.removeListener('disconnect', this.onDagClose);
    } catch (e) {
      logger.warn('deactivate:error -> ', e);
    }
  }

  async isAuthorized(): Promise<boolean> {
    try {
      return (await this.activeEVMProvider.request({method: 'eth_accounts'})).length > 0;
    } catch {
      return false;
    }
  }
}

export {StargazerConnector};
