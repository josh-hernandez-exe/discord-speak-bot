
function has(obj, propString) {
  if(typeof propString !== 'string') throw new Error();
  if(propString.length === 0) return true;

  const propList = propString.split('.')

  if(propList.length === 0) return true;

  let doesHave = true;
  let curObj = obj;

  for(const value of propList) {
    if(curObj === null || typeof curObj !== 'object') {
      doesHave = false;
    }
    curObj = curObj[value];
  }

  if(doesHave && curObj === undefined) doesHave = false;

  return doesHave;
}

function parseArgs(line,flagPrefix='--') {
  const args = {};
  const lastIndex = -1;
  const lineArray = line.split(' ').filter((value) => {
    if(!typeof value === 'string') return false;
    if(value.length === 0) return false;
    if(value === '\t') return false;
    if(value === '\n') return false;
    return true;
  });
  const isUsed = new Array(lineArray.length);
  isUsed.fill(false);

  lineArray.forEach((value,index) => {
    if (isUsed[index]) {
      return;
    } else if(value.startsWith(flagPrefix)) {
      flag = value.substring(flagPrefix.length,value.length);

      if(flag.length === 0) return;

      isUsed[index] = true;
      if(index+1 < lineArray.length && !lineArray[index+1].startsWith(flagPrefix)) {
        args[flag] = lineArray[index+1];
        isUsed[index+1] = true;
      } else {
        args[flag] = true;
      }
    }
  });

  const leftover = lineArray.filter((value,index) => !isUsed[index]);

  return [args, leftover];
}

module.exports = {
  has,
  parseArgs,
}
