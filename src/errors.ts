class StargazerConnectorError extends Error {
  constructor(message: string) {
    super();
    this.name = this.constructor.name;
    this.message = message;
  }
}

class StargazerConnectorUserRejectionError extends StargazerConnectorError {
  constructor() {
    super('The user rejected the request.');
  }
}

export {StargazerConnectorError, StargazerConnectorUserRejectionError};
