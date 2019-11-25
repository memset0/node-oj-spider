require('./function.js')
let SYZOJSpiderClass = require('./modules/SYZOJSpider.js');
let UOJUploaderClass = require('./modules/UOJUploader.js');

let LOJSpider = new SYZOJSpiderClass(
  'LOJ',
  'https://loj.ac',
  '123456',
  '123456'
);

let UOJUploader = new UOJUploaderClass(
  'UOJ',
  'http://uoj.ac',
  '123456',
  '123456'
);

(async () => {
  await LOJSpider.download(1, `down`)
  await MOJUploader.upload(1, `down`)
})()