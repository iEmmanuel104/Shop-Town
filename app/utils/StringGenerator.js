//  generate password

const generatePassword = (num) => {
    const length = num;
        charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
};

// generate 4 digit code

const generateCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000);
    return code;
}

module.exports = { generatePassword, generateCode };




