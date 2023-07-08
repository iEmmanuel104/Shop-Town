'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addIndex('Brand', ['businessEmail']);
    await queryInterface.addIndex('User', ['email']);
    await queryInterface.addIndex('DeliveryAddress', ['storeId']);
    await queryInterface.addIndex('DeliveryAddress', ['userId']);

  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex('Brand', ['businessEmail']);
    await queryInterface.removeIndex('User', ['email']);
    await queryInterface.removeIndex('DeliveryAddress', ['storeId']);
    await queryInterface.removeIndex('DeliveryAddress', ['userId']);
  }
};
