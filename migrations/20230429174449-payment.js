'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    //  modify column
    await queryInterface.changeColumn('Payment', 'paymentMethod', {
      type: Sequelize.ENUM(["CARD", "KCREDIT", "CASH"]),
      defaultValue: "CARD",
      allowNull: false
    });
      

  },
  async down(queryInterface, Sequelize) {
    //  modify column
    await queryInterface.changeColumn('Payment', 'paymentMethod', {
      type: Sequelize.ENUM(["CARD", "CASH"]),
      defaultValue: "CARD",
      allowNull: false
    });
  }
};