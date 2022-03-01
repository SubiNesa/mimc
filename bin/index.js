#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import cheerio from "cheerio";
import nodeHtmlToImage from "node-html-to-image";
import chalk from "chalk";
import path from "path";

const program = new Command();

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
    if (file.includes("node_modules")) {
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
      console.error(chalk.red(err));
    }
  }

  return fetchedFiles;
};

/**
 * Generate png diagram
 * @param {*} data
 * @param {*} imageName
 * @returns Promise
 */
const generateDiagram = (argv, data, id, target, attr) => {
  return new Promise((resolve) => {
    const dir = argv.commonImageOutput
      ? argv.imagesOuput
      : path.join(target, argv.imagesOuput);

    // create folder to store images
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    const $ = cheerio.load(
      `<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
      <script>mermaid.initialize({startOnLoad:true});</script>
      <div class="mermaid"></div>`,
      { decodeEntities: false }
    );

    if (attr.width || attr.height) {
      const body = `body {
        ${attr.width ? "width:" + attr.width + "px;" : ""}
        ${attr.height ? "height:" + attr.height + "px;" : ""}
      }`;
      $("head").append(`<style>${body}</style>`);
    }
    $(".mermaid").append(data);

    nodeHtmlToImage({
      output: attr.image
        ? path.join(dir, `${attr.image}.png`)
        : path.join(dir, `diagram-${id}.png`),
      html: $.html(),
      transparent: attr.transparent == true,
    }).then(() => resolve());
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
      resolve(fs.readFileSync(`${file}`, "utf8"));
    } catch (error) {
      console.log(chalk.red(error));
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
      const target = file.match(/\/||\\/gm) ? path.dirname(file) : "./";

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
      const mermaids = $("div[data-mermaid]");
      for (let index = 0; index < mermaids.length; index++) {
        let id = Date.now();
        const element = mermaids[index];

        const attr = $(element).data();
        if (argv.debug) {
          console.info(attr);
        }
        const title = attr.title || "";

        // generate id
        if (!attr.mermaid) {
          $(element).attr("data-mermaid", id);
        } else {
          id = attr.mermaid;
        }

        // image name
        if (attr.image) {
          attr.image = attr.image.replace(/[^A-Z0-9]+/gi, "-").toLowerCase();
        } else {
          attr.image = `diagram-${id}`;
        }
        // generate image diagram
        await generateDiagram(
          argv,
          $(element).find("code").html(),
          id,
          target,
          attr
        );

        // remove existing code
        if ($(element).children(".data-diagram").html()) {
          $(element).children(".data-diagram").remove();
        }

        // add diagram
        $(element).append(`<div class="data-diagram">
<!-- Code auto generated on ${new Date()} -->
<img src="${
          argv.commonImageOutput
            ? path.join(target.replace(/[^\/]*/g, "."), argv.imagesOuput)
            : argv.imagesOuput
        }/${
          attr.image ? attr.image : "image"
        }.png" title="${title}" alt="${title}"/>
</div>`);
      }

      // update file
      fs.writeFileSync(
        `${file}`,
        $.html().replace(/&gt;/g, ">").replace(/&lt;/g, "<")
      );

      return resolve();
    } catch (err) {
      console.error(chalk.red(err));
    }
  });
};

program
  .usage("[options]")
  .option("-d, --debug", "output extra debugging")
  .option(
    "-o, --images-ouput [directory]",
    "folder where images will be placed",
    "docs"
  )
  .option(
    "-c, --common-image-output",
    "all images will be placed in the same folder",
    false
  )
  .option(
    "-p, --path [path]",
    "pathname where the mimc will start the search for markdown file",
    "./"
  )
  .option(
    "-m, --markdown-file [file]",
    "name of the markdown file",
    "README.md"
  )
  .option("-e, --exclude [directories...]", "exclude folders")
  .action(async (options) => {
    try {
      const files = fetchFiles(options);
      if (options.debug) {
        console.info(files);
      }
      for (let index = 0; index < files.length; index++) {
        await mimc(options, files[index]);
      }
    } catch (err) {
      console.error(chalk.red(err));
    }
  })
  .parse(process.argv);
