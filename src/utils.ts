const getAllProperties = (object: any) => {
  const properties = new Set<[any, string | symbol]>();

  do {
    for (const key of Reflect.ownKeys(object)) {
      properties.add([object, key]);
    }
  } while ((object = Reflect.getPrototypeOf(object)) && object !== Object.prototype);

  return properties;
};

const bindAllMethods = (self: any) => {
  for (const [object, key] of getAllProperties(self.constructor.prototype)) {
    if (key === 'constructor') {
      continue;
    }

    const descriptor = Reflect.getOwnPropertyDescriptor(object, key);
    if (descriptor && typeof descriptor.value === 'function') {
      self[key] = self[key].bind(self);
    }
  }

  return self;
};

const loggingProxy = <T extends object>(target: T, prefix = ''): T => {
  return new Proxy(target, {
    get: (target, property) => {
      const value = target[property];
      console.log(`${prefix}#get: ${String(property)}`);
      if (typeof value === 'function') {
        return async (...args: any[]) => {
          console.log(`${prefix}#call: ${String(property)}`, args);
          // eslint-disable-next-line @typescript-eslint/ban-types
          const rvalue: Promise<never> | never = (value as Function).call(target, ...args);

          if ('then' in rvalue && typeof rvalue.then === 'function') {
            rvalue.then((v) => console.log(`${prefix}#response(Async): ${String(property)}`, v));
          } else {
            console.log(`${prefix}#response: ${String(property)}`, rvalue);
          }

          return rvalue;
        };
      }
      return value;
    }
  });
};

export {getAllProperties, bindAllMethods, loggingProxy};
