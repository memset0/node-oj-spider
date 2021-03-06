module.exports = class {
  /**
   * UOJ Uploader (by memset0)
   * 适用于 UOJ 社区版
   */
  console_log(res) {
    console.log(`[${this.name} Uploader] ` + res)
  }
  throw_error(res) {
    throw new Error(`[${this.name} Uploader] ` + res);
  }
  /**
   * 登录
   * @param {string} username 用户名
   * @param {string} password 密码
   */
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
  /**
   * 上传题目
   * @param {int} problem 题目编号
   * @param {path} destination 目标目录
   */
  async upload(problem, destination) {
    let info = JSON.parse(fs.readFileSync(path.join(destination, 'main.json')))
    let token = null
    // 获取操作的 token
    await this.agent
      .get(`${this.host}/problem/${problem}/manage/statement`)
      .then(res => {
        let $ = JQ(res.text)
        token = $('[name=_token]').attr('value')
      })
    // 上传题面
    await this.agent
      .post(`${this.host}/problem/${problem}/manage/statement`)
      .type('form')
      .send({
        _token: token,
        problem_title: info.title,
        problem_tags: '',
        problem_content_md: info.markdown,
        problem_is_hidden: 'on',
        'save-problem': '', // 注意当且仅当添加此元素才会触发后端的 save 方法
      })
      .then(res => {
        if (res.header['content-encoding'] == 'gzip') {
          this.throw_error('题面上传失败')
        }
        this.console_log('题面上传完毕')
      })
    // 上传数据
    await this.agent
      .post(`${this.host}/problem/${problem}/manage/data`)
      .attach('problem_data_file', path.join(destination, 'data.zip'))
      .field('problem_data_file_submit', 'submit') // 注意当且仅当添加此元素才会触发后端的 upload 方法
      .use(superagent_progress)
      .then(res => {
        this.console_log('数据上传完毕')
      })
    // 刷新后台数据状态
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
  /**
   * constructor
   * @param {string} name OJ 名称
   * @param {url} host OJ 地址
   * @param {string} username 用户名，如果不登录则无需配置
   * @param {string} password 密码，如果不登录则无需配置
   * @param {string} sessid 如果不使用 cookies 登录则无需配置
   * @param {string} token 如果不使用 cookies 登录则无需配置
   * @param {string} token_checksum 如果不使用 cookies 登录则无需配置
   */
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