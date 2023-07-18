//  generate password

const generateRandomString = (num) => {
    const length = num;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let retVal = '';
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
};

// generate 4 digit code

const generateCode = (number) => {
    let code;
    if (number) {
        // genrate a code with the number of digits specified
        const min = Math.pow(10, number - 1);
        const max = Math.pow(10, number) - 1;
        code = Math.floor(min + Math.random() * (max - min + 1));
    } else {
        code = Math.floor(1000 + Math.random() * 9000);
    }

    return code;
};

module.exports = { generateRandomString, generateCode };
