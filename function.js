global.fs = require('fs');
global.path = require('path');
global.jsdom = require('jsdom');
global.jQuery = require('jQuery');
global.crypto = require('crypto');
global.adm_zip = require('adm-zip');
global.superagent = require('superagent');

const { JSDOM } = jsdom;
global.JQ = text => {
  let { window } = new JSDOM(text);
  return jQuery(window);
}
global.md5 = text => {
  return crypto.createHash('md5').update(text).digest('hex')
}

// 递归新建文件夹
fs.mkdirsSync = dirname => {
  if (fs.existsSync(dirname)) {
      return true;
  } else {
      if (fs.mkdirsSync(path.dirname(dirname))) {
          fs.mkdirSync(dirname);
          return true;
      }
  }
}
// 遍历文件夹及子文件夹内的所有文件
fs.readdirsSync = thispath => {
  let result = [];
  if (fs.statSync(thispath).isDirectory()) {
    fs.readdirSync(thispath).forEach(thatpath => {
      result = result.concat(fs.readdirsSync(path.join(thispath, thatpath)));
    })
  } else {
    result.push(thispath)
  }
  return result;
}
// 删除整个文件夹或文件
fs.rmdirsSync = thispath => {
  if (fs.statSync(thispath).isDirectory()) {
    fs.readdirSync(thispath).forEach(thatpath => {
      fs.rmdirsSync(path.join(thispath, thatpath));
    })
    fs.rmdirSync(thispath)
  } else {
    fs.unlinkSync(thispath)
  }
}

global.ProblemClass = class {
  
}