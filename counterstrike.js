'use strict';

const shim = require('fabric-shim');
const uuid = require('node-uuid');

class Chaincode {

  async Init(stub) {
    console.info('=========== Instantiated Counterstrike chaincode ===========');
    return shim.success();
  }

  async Invoke(stub) {
    let ret = stub.getFunctionAndParameters();
    console.info(ret);

    let method = this[ret.fcn];
    if (!method) {
      console.error('no function of name:' + ret.fcn + ' found');
      throw new Error('Received unknown function ' + ret.fcn + ' invocation');
    }
    try {
      let payload = await method(stub, ret.params);
      return shim.success(payload);
    } catch (err) {
      console.log(err);
      return shim.error(err);
    }
  }

  async initLedger(stub, args) {
    console.info('============= START : initLedger ===========');
    let products = [];
    products.push({
      id: uuid.v4(),
      name: 'Aspirin',
      manufacturer: 'Smith Pharma Inc.',
      isSold: false,
      isGenuine: true,
      history: [{
        location: ['-29.52974', '24.52815'],
        name: "Factory",
        isGenuine: true
      }],
      consumer: null,
    });
    products.push({
      id: uuid.v4(),
      name: 'iPhone',
      manufacturer: 'Apple Inc.',
      isSold: false,
      isGenuine: true,
      history: [{
        location: ['-29.52974', '24.52815'],
        name: "Factory",
        isGenuine: true
      }],
      consumer: null,
    });
    products.push({
      id: uuid.v4(),
      name: 'BMW brake pads',
      manufacturer: 'Brembo',
      isSold: false,
      isGenuine: true,
      history: [{
        location: ['-29.52974', '24.52815'],
        name: "Factory",
        isGenuine: true
      }],
      consumer: null,
    });

    for (let i = 0; i < products.length; i++) {
      products[i].docType = 'product';
      await stub.putState(products[i].id, Buffer.from(JSON.stringify(products[i])));
      console.info('Added <--> ', products[i]);
    }
    console.info('============= END : initLedger ===========');
  }

  async createProduct(stub, args) {
    console.info('============= START : createProduct ===========');
    if (args.length != 3) {
      throw new Error('Incorrect arguments. Expecting "name", "manugacturer", "location"');
    }

    let product = {
      docType: 'product',
      id: uuid.v4(),
      name: args[0],
      manufacturer: args[1],
      isSold: false,
      isGenuine: true,
      history: [{
        location: args[2],
        name: "Factory",
        isGenuine: true
      }],
      consumer: null,
    }

    const res = Buffer.from(JSON.stringify(product));
    await stub.putState(product.id, res);
    console.info('============= END : createProduct ===========');
    return res;
  }

  async listProducts(stub, args) {
    console.info('============= START : listProducts ===========');
    let iterator = await stub.getStateByRange('', '');
    let allResults = [];
    while (true) {
      let res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        let jsonRes = JSON.parse(res.value.value.toString());
        allResults.push(jsonRes);
      }
      if (res.done) {
        console.log('end of data');
        await iterator.close();
        return Buffer.from(JSON.stringify(allResults));
      }
    }
  }

  async getProduct(stub, args) {
    console.info('============= START : getProduct ===========');
    if (args.length != 1) {
      throw new Error(`Incorrect arguments. Expecting "productId", e.g. ${uuid.v4()}`);
    }
    let productAsBytes = await stub.getState(args[0]);
    if (!productAsBytes || productAsBytes.toString().length <= 0) {
      throw new Error(`Product with id ${args[0]} does not exist.`);
    }
    console.info('============= END : getProduct ===========');
    return productAsBytes;
  }

  async reportProduct(stub, args) {
    console.info('============= START : reportProduct ===========');
    if (args.length != 2) {
      throw new Error('Incorrect arguments. Expecting "productId", "reason"');
    }
    let productAsBytes = await stub.getState(args[0]);
    let product = JSON.parse(productAsBytes);
    product.history[product.history.length - 1].isGenuine = false;
    product.history[product.history.length - 1].reason = args[1];
    product.isGenuine = false;
    const res = Buffer.from(JSON.stringify(product));
    await stub.putState(args[0], res);
    console.info('============= END : reportProduct ===========');
    return res;
  }

  async transferProduct(stub, args) {
    console.info('============= START : transferProduct ===========');
    if (args.length != 2) {
      throw new Error('Incorrect arguments. Expecting "productId", "target"');
    }
    let productAsBytes = await stub.getState(args[0]);
    let product = JSON.parse(productAsBytes);
    const target = JSON.parse(args[1])
    target.isGenuine = product.isGenuine;
    product.history.push(target)
    const res = Buffer.from(JSON.stringify(product));
    await stub.putState(args[0], res);
    console.info('============= END : transferProduct ===========');
    return res;
  }

  async sellProduct(stub, args) {
    console.info('============= START : sellProduct ===========');
    if (args.length != 2) {
      throw new Error('Incorrect arguments. Expecting "productId", "consumer"');
    }
    let productAsBytes = await stub.getState(args[0]);
    let product = JSON.parse(productAsBytes);
    if (product.isSold || !product.consumer) {
      throw new Error(`Product ${args[0]} is already sold to an end consumer`);
    }
    const consumer = JSON.parse(args[1]);
    product.consumer = consumer;
    product.isSold = true;
    const res = Buffer.from(JSON.stringify(product));
    await stub.putState(args[0], res);
    console.info('============= END : sellProduct ===========');
    return res;
  }
};

shim.start(new Chaincode());
