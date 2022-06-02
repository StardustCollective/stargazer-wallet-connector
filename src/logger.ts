import debug from 'debug';

const logger = {
  debug: debug('stargazer:connector:debug'),
  info: debug('stargazer:connector:info'),
  warn: debug('stargazer:connector:warn'),
  error: debug('stargazer:connector:error')
};

export {logger};
