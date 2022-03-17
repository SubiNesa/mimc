# mimc

### Mermaid Image Markdown Creator

The command-line solution for creating [mermaid](https://mermaid-js.github.io/) diagrams and visualizations in markdown (ex: [bitbucket](https://www.atlassian.com/software/bitbucket/enterprise)) by generating the png and automatically importing them.

## Installation

```bash
npm install mimc
```

## Quick Start

You can write code the diagram code with help of [mermaid live editor](https://mermaid-js.github.io/mermaid-live-editor/).

### Usage

In the README.md file add the `<div data-mermaid>`.

```html
<div data-mermaid data-title="Mermaid Sequence Diagram">
  <code>
    sequenceDiagram participant Alice participant Bob Alice->>John: Hello John,
    how are you? loop Healthcheck John->>John: Fight against hypochondria end
    Note right of John: Rational thoughts <br />prevail! John-->>Alice: Great!
    John->>Bob: How about you? Bob-->>John: Jolly good!
  </code>
</div>
```

#### Data attributes

<table>
  <thead>
    <tr>
      <th>Attribute</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>data-mermaid</th>
      <td>Used to create the name of the files. If empty will be auto-generated</td>
      <td>true</td>
    </tr>
    <tr>
      <th>data-title</th>
      <td>Create <i>title</i> and <i>alt</i> attribute in the generated diagram</td>
      <td>false</td>
    </tr>
    <tr>
      <th>data-transparent</th>
      <td>Generate images with transparent background</td>
      <td>false</td>
    </tr>
    <tr>
      <th>data-width</th>
      <td>Width of the generated image</td>
      <td>false</td>
    </tr>
    <tr>
      <th>data-height</th>
      <td>Height of the generated image</td>
      <td>false</td>
    </tr>
  </tbody>
</table>

### Run

```bash
npx mimc
```

This will generate additional element in the `<div class="data-mermaid">` after `<code>` and code will be stored in separate txt file.

```html
<div class="data-diagram">
  <img
    src="docs/sequence-diagram.png"
    title="Mermaid Sequence Diagram"
    alt="Mermaid Sequence Diagram"
  />
</div>
```

Output

```html
<div data-mermaid="1646256939884" data-title="Mermaid Sequence Diagram">
  <!-- Code file located in docs -->
  <div class="data-diagram">
    <!-- Image auto generated on Wed Mar 02 2022 22:35:42 GMT+0100 (Central European Standard Time) -->
    <img
      src="docs/diagram-1646256939884.png"
      title="Mermaid Sequence Diagram"
      alt="Mermaid Sequence Diagram"
    />
  </div>
</div>
```

> ❗ txt code file can be updated in order to genrate new image

## Demo

<img src="https://user-images.githubusercontent.com/8751579/156455459-c6d08b9b-67c2-478c-80ba-64eeb1711a1d.gif" title="mimc demo" alt="mimc"/>

## Options

The `options` can be passed as the parameter.

<table>
  <thead>
    <tr>
      <th>Option</th>
      <th>Default Value</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>-o, --images-ouput</th>
      <td>'docs'</td>
      <td>Folder where images will be placed</td>
    </tr>
    <tr>
      <th>-c, --common-image-output</th>
      <td>false</td>
      <td>All images will be placed in the same folder</td>
    </tr>
    <tr>
      <th>-p, --path</th>
      <td>'./'</td>
      <td>Pathname where the mimc will start the search for markdown file</td>
    </tr>
    <tr>
      <th>-m, --markdown-file</th>
      <td>'README.md'</td>
      <td>Name of the markdown file</td>
    </tr>
    <tr>
      <th>-e, --exclude</th>
      <td>[]</td>
      <td>Exclude folders. <i>node_modules</i> will always be excluded by default</td>
    </tr>
    <tr>
      <th>-x, --img-ext</th>
      <td>svg</td>
      <td>image file extension (png, jpeg or svg)</td>
    </tr>
  </tbody>
</table>

## License

[MIT](LICENSE)
