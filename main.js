const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const jQuery = require('jQuery');
const crypto = require('crypto');
const adm_zip = require('adm-zip');
const superagent = require('superagent');

const { JSDOM } = jsdom;
let JQ = text => {
  let { window } = new JSDOM(text);
  return jQuery(window);
}
let md5 = text => {
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

let ProblemClass = class {
  
}

let SYZOJSpiderClass = class {
  console_log(res) {
    console.log(`[${this.name} Spider] ` + res)
  }
  throw_error(res) {
    throw new Error(`[${this.name} Spider] ` + res);;
  }
  render_string_to_markdown(source){
    return source;
  }
  login(username, password) {
    password = md5(password + 'syzoj2_xxx');
    this.agent
      .post(`${this.host}/api/login`)
      .send({
        'username': username,
        'password': password
      })
      .then(res => {
        if (res.body.error_code && res.body.error_code != 1) {
          this.throw_error(`登录失败 ${res.body.error_code} ${
            (code => {
              switch (code) {
                case 1001:
                  return '用户不存在'
                case 1002:
                  return '密码错误'
                case 1003:
                  return '尚未设置密码'
                default:
                  return '未知错误'
              }
            })(res.body.error_code)
          }`)
        }
      });
  }
  async get(problem, destination, callback) {
    let result = new ProblemClass();
    await this.agent
      .get(`${this.host}/problem/${problem}/export`)
      .then(res => {
        if (!res.body.success) {
          this.throw_error(`爬取 ${problem} 错误 ` + res.body.error.message);
        }
        // 题目基本信息
        result.pid = problem;
        result.title = res.body.obj.title;
        result.memory_limit = res.body.obj.memory_limit;
        result.time_limit = res.body.obj.time_limit;
        result.problem_type = res.body.obj.type;
        // 题目内容
        result.description = this.render_string_to_markdown(res.body.obj.description);
        result.input_format = this.render_string_to_markdown(res.body.obj.input_format);
        result.output_format = this.render_string_to_markdown(res.body.obj.output_format);
        result.example = this.render_string_to_markdown(res.body.obj.example);
        result.limit_and_hint = this.render_string_to_markdown(res.body.obj.limit_and_hint);
        // 合并题目内容为 markdown
        result.markdown = '';
        if (result.description) result.markdown += '### 题目描述\n\n' + result.description + '\n\n';
        if (result.input_format) result.markdown += '### 输入格式\n\n' + result.input_format + '\n\n';
        if (result.output_format) result.markdown += '### 输出格式\n\n' + result.output_format + '\n\n';
        if (result.example) result.markdown += '### 样例\n\n' + result.example + '\n\n';
        if (result.limit_and_hint) result.markdown += '### 数据范围与提示\n\n' + result.limit_and_hint + '\n\n';
      });
    result = callback(result)
    fs.mkdirsSync(destination);
    fs.writeFileSync(path.join(destination, 'main.json'), JSON.stringify(result));
    fs.writeFileSync(path.join(destination, 'statement.md'), result.markdown);
    this.console_log('题面下载完毕')
  }
  async data(problem, destination) {
    fs.mkdirsSync(destination);
    await this.agent
      .get(`${this.host}/problem/${problem}/testdata/download`)
      .then(res => {
        fs.writeFileSync(path.join(destination, 'down.zip'), res.body)
        this.console_log('数据下载完毕')
        let zip = new adm_zip(path.join(destination, 'down.zip'));
        fs.mkdirsSync(path.join(destination, 'down'));
        zip.extractAllTo(path.join(destination, 'down'), true);
        let filelist = fs.readdirsSync(path.join(destination, 'down'));
        let data_counter = 0
        let addTestData = (input, output) => {
          data_counter++
          fs.writeFileSync(path.join(destination, `data${data_counter}.in`), fs.readFileSync(input))
          fs.writeFileSync(path.join(destination, `data${data_counter}.out`), fs.readFileSync(output))
        }
        filelist.forEach(e => {
          if (path.extname(e) == '.in') {
            if (filelist.indexOf(e.replace(/.in$/g, '.out')) != -1) {
              addTestData(e, e.replace(/.in$/g, '.out'))
            }
            if (filelist.indexOf(e.replace(/.in$/g, '.ans')) != -1) {
              addTestData(e, e.replace(/.in$/g, '.ans'))
            }
          }
        })
        fs.rmdirsSync(path.join(destination, 'down'))
        fs.rmdirsSync(path.join(destination, 'down.zip'))
        if (fs.existsSync(path.join(destination, 'data.zip'))) {
          fs.rmdirsSync(path.join(destination, 'data.zip'))
        }
        let statement_information = JSON.parse(fs.readFileSync(path.join(destination, 'main.json')))
        let uoj_config = ''
        uoj_config += 'use_builtin_judger on\nuse_builtin_checker ncmp\n'
        uoj_config += `n_tests ${data_counter}\nn_ex_tests 0\nn_sample_tests 0\n`
        uoj_config += 'input_pre data\ninput_suf in\n'
        uoj_config += 'output_pre data\noutput_suf out\n'
        uoj_config += `time_limit ${Math.ceil(statement_information.time_limit / 1000.0)}\n`
        uoj_config += `memory_limit ${statement_information.memory_limit}\n`
        fs.writeFileSync(path.join(destination, `problem.conf`), uoj_config)
        zip = new adm_zip();
        zip.addLocalFolder(destination);
        zip.writeZip(path.join(destination, 'data.zip'));
        this.console_log('数据压缩完毕')
      })
  }
  async download(problem, destination, callback) {
    this.console_log('下载题目 ' + problem)
    await this.get(problem, destination, callback);
    await this.data(problem, destination);
  }
  constructor(name, host, username=null, password=null) {
    this.name = name;
    this.host = host;
    this.agent = superagent.agent();
    if (username && password) {
      this.login(username, password);
    }
  }
}

let UOJUploaderClass = class {
  console_log(res) {
    console.log(`[${this.name} Uploader] ` + res)
  }
  throw_error(res) {
    throw new Error(`[${this.name} Uploader] ` + res);
  }
  async login(username, password) {
    this.agent
      .get(`${this.host}/login`)
      .then(res => {
        let csrf_re = /_token : "([\S]+)",/g
        let csrf = csrf_re.exec(res.text)[1]
        let salt_re = /password : md5\(\$\('#input-password'\).val\(\), "([\S]+)"\)/g
        let salt = salt_re.exec(res.text)[1]
        console.log({
          '_token' : csrf,
          'login' : '',
          'username' : username,
          'password' : password
        })
        this.agent
          .post(`${this.host}/login`)
          .send({
            '_token' : csrf,
            'login' : '',
            'username' : username,
            'password' : password
          })
          .then(res => {
            console.log(res.header)
          })
      })
    }
  async upload(problem, destination) {
    let info = JSON.parse(fs.readFileSync(path.join(destination, 'main.json')))
    let token = null
    await this.agent
      .get(`${this.host}/problem/${problem}/manage/statement`)
      .then(res => {
        let $ = JQ(res.text)
        token = $('[name=_token]').attr('value')
      })
    await this.agent
      .post(`${this.host}/problem/${problem}/manage/statement`)
      .type('form')
      .send({
          _token: token,
          problem_title: info.title,
          problem_tags: '',
          problem_content_md: info.markdown,
          problem_is_hidden: 'on',
          'save-problem': '',
        })
      .then(res => {
        if (res.header['content-encoding'] == 'gzip') {
          this.throw_error('题面上传失败')
        }
        this.console_log('题面上传完毕')
      })
    await this.agent
      .post(`${this.host}/problem/${problem}/manage/data`)
      .attach('problem_data_file', path.join(destination, 'data.zip'))
      .field('problem_data_file_submit', 'submit')
      .then(res => {
        this.console_log('数据上传完毕')
      })
    await this.agent
      .post(`${this.host}/problem/${problem}/manage/data`)
      .type('form')
      .send({
          _token: token,
          'submit-data': 'data',
        })
      .then(res => {
        this.console_log('数据更新完毕')
      })
  }
  constructor(name, host, username, password, sessid, token, token_checksum) {
    this.name = name;
    this.host = host;
    this.agent = new superagent.agent();
    if (token && token_checksum) {
      this.agent
        .set('Cookie', `uoj_remember_token=${token};uoj_remember_token_checksum=${token_checksum};UOJSESSID=${sessid}`);
    } else if (username && password) {
      this.login(username, password);
    }
  }
}