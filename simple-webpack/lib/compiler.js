
const fs = require('fs');
const path = require('path');
const { getAST, getDependencis, transform } = require('./parser');


module.exports = class Compiler {
  constructor(options) {
    const { entry, output } = options;
    this.entry = entry;
    this.output = output;
    this.modules = []; // 模块列表
  }

  run() {
    const entryModule = this.buildModule(this.entry, true); // 入口模块
    this.modules.push(entryModule);
    this.modules.map((_module) => {
      _module.dependencies.map((dependency) => {
        this.modules.push(this.buildModule(dependency));
      });
    });
    this.emitFiles();
  }

  buildModule(filename, isEntry) {
    let ast;
    if (isEntry) {
      ast = getAST(filename); // 获取AST
    } else {
      let absolutePath = path.join(process.cwd(), './src', filename);
      ast = getAST(absolutePath);
    }

    return {
      filename,
      dependencies: getDependencis(ast), // 获取依赖
      transformCode: transform(ast) // 转换代码
    };
  }

  emitFiles() {
    const outputPath = path.join(this.output.path, this.output.filename);
    let modules = '';
    this.modules.map((_module) => {
      modules += `'${_module.filename}': function (require, module, exports) { ${_module.transformCode} },`
    });

    const bundle = `
            (function(modules) {
                function require(fileName) {
                    const fn = modules[fileName];
        
                    const module = { exports : {} };
        
                    fn(require, module, module.exports);
        
                    return module.exports;
                }

                require('${this.entry}');
            })({${modules}})
        `;

    fs.writeFileSync(outputPath, bundle, 'utf-8');
  }
};
