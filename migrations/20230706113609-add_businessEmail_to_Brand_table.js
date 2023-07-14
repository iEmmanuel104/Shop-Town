'use strict';

const { validate } = require('node-cron');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    //  add store settings to Store table
    await queryInterface.addColumn('Store', 'businessEmail', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }


    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Store', 'businessEmail');
  }
};
