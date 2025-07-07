const checkUndefined = (value) =>  {
    if(value === undefined || value === null || value === ''){
        return true;
    }
    return false;
};

module.exports = {
  checkUndefined
}