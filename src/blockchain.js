/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message`
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *
 */

const SHA256 = require("crypto-js/sha256");
const BlockClass = require("./block.js");
const bitcoinMessage = require("bitcoinjs-message");

class Blockchain {
  /**
   * Constructor of the class, you will need to setup your chain array and the height
   * of your chain (the length of your chain array).
   * Also everytime you create a Blockchain class you will need to initialized the chain creating
   * the Genesis Block.
   * The methods in this class will always return a Promise to allow client applications or
   * other backends to call asynchronous functions.
   */
  constructor() {
    /**@type {Array<BlockClass.Block>} */
    this.chain = [];
    this.initializeChain();
  }

  /**
   * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
   * You should use the `addBlock(block)` to create the Genesis Block
   * Passing as a data `{data: 'Genesis Block'}`
   */
  async initializeChain() {
    if (this.height === -1) {
      let block = new BlockClass.Block({ data: "Genesis Block" });
      await this._addBlock(block);
    }
  }

  get height() {
    return this.chain.length - 1;
  }

  /**
   * Utility method that return a Promise that will resolve with the height of the chain
   */
  getChainHeight() {
    return new Promise((resolve, reject) => {
      resolve(this.height);
    });
  }

  /**
   * _addBlock(block) will store a block in the chain
   * @param {BlockClass.Block} block
   * The method will return a Promise that will resolve with the block added
   * or reject if an error happen during the execution.
   * You will need to check for the height to assign the `previousBlockHash`,
   * assign the `timestamp` and the correct `height`...At the end you need to
   * create the `block hash` and push the block into the chain array. Don't for get
   * to update the `this.height`
   * Note: the symbol `_` in the method name indicates in the javascript convention
   * that this method is a private method.
   */
  async _addBlock(block) {
    let previousBlock = this.chain.slice(-1).pop();
    if (previousBlock) {
      block.previousBlockHash = previousBlock.hash;
    }
    block.height = this.height + 1;
    block.time = Date.now();
    block.setHash();
    this.chain.push(block);
  }

  /**
   * The requestMessageOwnershipVerification(address) method
   * will allow you  to request a message that you will use to
   * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
   * This is the first step before submit your Block.
   * The method return a Promise that will resolve with the message to be signed
   * @param {string} address
   * @returns {Promise<string>}
   */
  async requestMessageOwnershipVerification(address) {
    return `${address}:${new Date()
      .getTime()
      .toString()
      .slice(0, -3)}:starRegistry`;
  }

  /**
   * The submitStar(address, message, signature, star) method
   * will allow users to register a new Block with the star object
   * into the chain. This method will resolve with the Block added or
   * reject with an error.
   * Algorithm steps:
   * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
   * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
   * 3. Check if the time elapsed is less than 5 minutes
   * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
   * 5. Create the block and add it to the chain
   * 6. Resolve with the block added.
   * @param {string} address
   * @param {string} message
   * @param {*} signature
   * @param {*} star
   */
  async submitStar(address, message, signature, star) {
    let messageTime = new Date(Number(message.split(":")[1]));
    let currentTime = new Date();
    let diff = currentTime.getTime() - messageTime.getTime();
    if (diff < 5 * 60 * 1000) {
      bitcoinMessage.verify(message, address, signature);
      let block = new BlockClass.Block({ owner: address, star });
      await this._addBlock(block);
      return block;
    }
  }

  /**
   * This method will return a Promise that will resolve with the Block
   *  with the hash passed as a parameter.
   * Search on the chain array for the block that has the hash.
   * @param {string} hash
   * @returns {Promise<BlockClass.Block|undefined>}
   */
  async getBlockByHash(hash) {
    let block = this.chain.find((value) => value.hash == hash);
    return block;
  }

  /**
   * This method will return a Promise that will resolve with the Block object
   * with the height equal to the parameter `height`
   * @param {*} height
   */
  getBlockByHeight(height) {
    let self = this;
    return new Promise((resolve, reject) => {
      let block = self.chain.filter((p) => p.height === height)[0];
      if (block) {
        resolve(block);
      } else {
        resolve(null);
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with an array of Stars objects existing in the chain
   * and are belongs to the owner with the wallet address passed as parameter.
   * Remember the star should be returned decoded.
   * @param {string} address
   */
  async getStarsByWalletAddress(address) {
    return this.chain
      .slice(1)
      .filter((block) => block.getBData().address == address)
      .map((block) => block.getBData());
  }

  /**
   * This method will return a Promise that will resolve with the list of errors when validating the chain.
   * Steps to validate:
   * 1. You should validate each block using `validateBlock`
   * 2. Each Block should check the with the previousBlockHash
   */
  async validateChain() {
    let errorLog = [];
    let previousBlockHash = null;
    for (let i in this.chain) {
      try {
        this.chain[i].validate();
        if (this.chain[i].hash !== previousBlockHash) {
          errorLog.push(i);
        }
      } catch (error) {
        errorLog.push(error);
      }
      previousBlockHash = this.chain[i].hash;
    }
    return errorLog;
  }
}

module.exports.Blockchain = Blockchain;
