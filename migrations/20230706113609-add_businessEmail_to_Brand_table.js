'use strict';

const { validate } = require('node-cron');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    //  add store settings to Brand table
    await queryInterface.addColumn('Brand', 'businessEmail', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }


    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Brand', 'businessEmail');
  }
};
