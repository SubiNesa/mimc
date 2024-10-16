#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import * as cheerio from 'cheerio';
import path from 'path';
import puppeteer from 'puppeteer';

const program = new Command();

/**
 * Print with color
 * @param {*} text
 * @param {*} color
 */
const print = (text, color) => {
  switch (color) {
    case 'red':
      console.log(`\x1b[31m${text} \x1b[0m`);
      break;
    case 'green':
      console.log(`\x1b[32m${text} \x1b[0m`);
      break;
    case 'yellow':
      console.log(`\x1b[33m${text} \x1b[0m`);
      break;
    case 'blue':
      console.log(`\x1b[34m${text} \x1b[0m`);
      break;

    default:
      console.log(`${text}`);
      break;
  }
};

/**
 * Get all the files based on markdownFile
 * @param {*} argv
 * @returns Array
 */
const fetchFiles = (argv) => {
  const files = fs.readdirSync(argv.path);
  const fetchedFiles = [];
  const re = new RegExp(`${argv.markdownFile}`);

  for (let file of files) {
    // exclude node_modules by default
    if (file.includes('node_modules')) {
      continue;
    }

    try {
      const filepath = path.join(argv.path, file);
      const stats = fs.lstatSync(filepath);

      if (stats.isFile()) {
        if (filepath.match(re)) {
          fetchedFiles.push(filepath);
        }
      }

      if (stats.isDirectory()) {
        // exclude node_modules by user
        if (
          argv.exclude &&
          Array.isArray(argv.exclude) &&
          argv.exclude.includes(path.basename(filepath))
        ) {
          continue;
        }
        const childFiles = fs.readdirSync(filepath);
        files.push(...childFiles.map((f) => path.join(file, f)));
      }
    } catch (err) {
      print(err, 'red');
    }
  }

  return fetchedFiles;
};

/**
 * Generate code file
 * @param {*} dir
 * @param {*} data
 * @param {*} id
 * @returns Promise
 */
const generateCodeFile = (dir, data, id) => {
  return new Promise((resolve) => {
    // create folder to store files
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    const file = path.join(dir, `code-${id}.txt`);

    if (!fs.existsSync(file) && data) {
      // create file to store code
      fs.writeFileSync(file, data);
    } else if (fs.existsSync(file) && !data) {
      // read existing code file to get stored code
      data = fs.readFileSync(file, 'utf8');
    } else {
      print(`No mermaid code provided in "${dir}"!`, 'yellow');
    }

    resolve(data);
  });
};

/**
 * Generate diagram
 * @param {*} dir
 * @param {*} data
 * @param {*} id
 * @param {*} attr
 * @param {*} imgExt
 * @returns Promise
 */
const generateDiagram = (dir, data, id, attr, imgExt) => {
  return new Promise(async (resolve) => {
    // create folder to store images
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    // config html to render
    const $ = cheerio.load(
      `<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
      <script>mermaid.initialize({startOnLoad:true});</script>
      <div class="mermaid"></div>`,
      { decodeEntities: false }
    );

    if (attr.width || attr.height) {
      const body = `body {
        ${attr.width ? 'width:' + attr.width + 'px;' : ''}
        ${attr.height ? 'height:' + attr.height + 'px;' : ''}
      }`;
      $('head').append(`<style>${body}</style>`);
    }
    $('.mermaid').append(data);

    // launch puppeteer and set content for new page
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent($.html());

    // define where to save the image
    const saveImgPath = path.join(dir, `diagram-${id}.${imgExt}`);

    // depending on img extension, either copy svg html or take a screenshot
    switch (imgExt) {
      case 'svg':
        const svg = await page.$eval(
          'svg',
          (el, attr) => {
            el.style.backgroundColor = attr.transparent == true ? '' : 'white';
            return el.outerHTML;
          },
          attr
        );
        fs.writeFileSync(saveImgPath, svg);
        break;
      case 'png':
      case 'jpeg':
        await page.screenshot({
          path: saveImgPath,
          omitBackground: attr.transparent == true ? true : false,
          type: imgExt,
        });
        break;
    }

    // avoid memory leaks by closing page and then the headless browser
    await page.close();
    await browser.close();

    resolve();
  });
};

/**
 * Read file
 * @param {*} file
 * @returns File
 */
const readfile = (file) => {
  return new Promise((resolve) => {
    try {
      resolve(fs.readFileSync(`${file}`, 'utf8'));
    } catch (error) {
      print(error, 'red');
    }
  });
};

/**
 * Update files with diagrams
 * @param {*} argv
 * @param {*} file
 * @returns Promise
 */
const mimc = (argv, file) => {
  return new Promise(async (resolve) => {
    try {
      const data = await readfile(file);
      const target = file.match(/\/||\\/gm) ? path.dirname(file) : './';
      // sanitize image extension
      const imgExt = ['png', 'jpeg', 'svg'].includes(argv.imgExt)
        ? argv.imgExt
        : 'svg';

      if (argv.debug) {
        console.info(target);
      }

      // load in the HTML
      const $ = cheerio.load(data, {
        decodeEntities: false,
        withStartIndices: true,
        xmlMode: true,
      });

      // get all diagrams
      const mermaids = $('div[data-mermaid]');
      for (let index = 0; index < mermaids.length; index++) {
        const element = mermaids[index];
        let id = Date.now();
        let code = null;
        if ($(element).children('code').html()) {
          code = $(element).find('code').html();
        }
        const dir = argv.commonImageOutput
          ? argv.imagesOuput
          : path.join(target, argv.imagesOuput);

        const attr = $(element).data();
        if (argv.debug) {
          console.log(attr);
        }
        const title = attr.title || '';

        // generate id
        if (!attr.mermaid) {
          $(element).attr('data-mermaid', id);
        } else {
          id = attr.mermaid;
        }

        // image name
        if (!/^\d+$/.test(id)) {
          id = id.replace(/[^A-Z0-9]+/gi, '-').toLowerCase();
        }
        // generate code file
        code = await generateCodeFile(dir, code, id);

        if (code) {
          // generate image diagram
          await generateDiagram(dir, code, id, attr, imgExt);

          if (argv.debug) {
            print(`Files created in ${dir}`, 'green');
          }

          // remove existing code
          if ($(element).children('.data-diagram').html()) {
            $(element).children('.data-diagram').remove();
          }

          // remove code from markdown
          if ($(element).children('code').html()) {
            $(element)
              .find('code')
              .replaceWith(`<!-- Code file located in ${dir} -->`);
          }

          // add diagram
          $(element).append(`<div class="data-diagram">
<!-- Image auto generated on ${new Date()} -->
<img src="${
            argv.commonImageOutput
              ? path.join(target.replace(/[^\/]*/g, '.'), argv.imagesOuput)
              : argv.imagesOuput
          }/diagram-${id}.${imgExt}" title="${title}" alt="${title}"/>
</div>`);
        }
      }

      // update file
      fs.writeFileSync(`${file}`, $.html());

      return resolve();
    } catch (err) {
      print(err, 'red');
    }
  });
};

program
  .usage('[options]')
  .option('-d, --debug', 'output extra debugging')
  .option(
    '-o, --images-ouput [directory]',
    'folder where images will be placed',
    'docs'
  )
  .option(
    '-c, --common-image-output',
    'all images will be placed in the same folder',
    false
  )
  .option(
    '-p, --path [path]',
    'pathname where the mimc will start the search for markdown file',
    './'
  )
  .option(
    '-m, --markdown-file [file]',
    'name of the markdown file',
    'README.md'
  )
  .option('-e, --exclude [directories...]', 'exclude folders')
  .option(
    '-x, --img-ext [extension]',
    'image file extension (png, jpeg or svg)',
    'svg'
  )
  .action(async (options) => {
    try {
      const files = fetchFiles(options);
      if (options.debug) {
        console.log(files);
      }
      for (let index = 0; index < files.length; index++) {
        await mimc(options, files[index]);
      }
    } catch (err) {
      print(err, 'red');
    }
  })
  .parse(process.argv);
