'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        //  add store settings to Store table
        await queryInterface.addColumn('Store', 'storeSettings', {
            type: Sequelize.JSONB,
            defaultValue: {},
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('Store', 'storeSettings');
    },
};
