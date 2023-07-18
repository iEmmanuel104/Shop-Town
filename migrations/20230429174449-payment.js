'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        //  modify column
        await queryInterface.changeColumn('Payment', 'paymentMethod', {
            type: Sequelize.ENUM(['card', 'kcredit', 'cash']),
            defaultValue: 'card',
            allowNull: false,
        });
    },
    async down(queryInterface, Sequelize) {
        //  modify column
        await queryInterface.changeColumn('Payment', 'paymentMethod', {
            type: Sequelize.ENUM(['card', 'cash']),
            defaultValue: 'card',
            allowNull: false,
        });
    },
};
