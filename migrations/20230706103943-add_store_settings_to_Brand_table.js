'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
  //  add store settings to Brand table
    await queryInterface.addColumn('Brand', 'storeSettings', {
      type: Sequelize.JSONB,
      defaultValue: {},
      allowNull: true
  }); 
},

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Brand', 'storeSettings');
  }
};
