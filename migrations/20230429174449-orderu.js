'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    //  modify column
    await queryInterface.addColumn('Order', 'orderNumber', {
      type: Sequelize.STRING,
      });
  },
  async down(queryInterface, Sequelize) {
    //  modify column
    await queryInterface.removeColumn('Order', 'orderNumber');
  }
};